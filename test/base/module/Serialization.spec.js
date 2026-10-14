import { describe, it, expect } from 'vitest';
import $ from 'jquery';
import Editor from '@/js/module/Editor';
import ComponentSelection from '@/js/module/ComponentSelection';

describe('Custom element serialization', () => {
  function create(markup, callback, tags = ['sample-icon']) {
    const editable = document.createElement('div');
    editable.innerHTML = markup;
    return {
      editable,
      $editable: $(editable),
      $note: $(document.createElement('textarea')),
      context: { modules: { componentSelection: new ComponentSelection({}) } },
      options: { atomicElements: [], serializableElements: tags, callbacks: { onSerializeElement: callback } },
    };
  }

  it('replaces configured elements without changing live content', () => {
    const markup = '<p>Before <sample-icon name="cart"><svg></svg></sample-icon> after</p>';
    const editor = create(markup, element => {
      const source = document.implementation.createHTMLDocument('').createElement('sample-icon');
      source.setAttribute('name', element.getAttribute('name'));
      return source;
    });
    expect(Editor.prototype.serialize.call(editor)).toBe('<p>Before <sample-icon name="cart"></sample-icon> after</p>');
    expect(editor.editable.innerHTML).toBe(markup);
  });

  it('keeps ordinary markup and template contents when the callback declines', () => {
    const markup = '<p><sample-icon name="cart"></sample-icon></p><template><b>Example</b></template>';
    const editor = create(markup, () => null);
    expect(Editor.prototype.serialize.call(editor)).toBe(markup);
  });

  it('keeps the original fast path when no elements are configured', () => {
    const markup = '<sample-icon><svg></svg></sample-icon>';
    const editor = create(markup, () => { throw new Error('Unexpected callback'); }, []);
    expect(Editor.prototype.serialize.call(editor)).toBe(markup);
  });

  it('removes editor-only editability while preserving authored attributes', () => {
    const editor = create('<sample-icon name="cart"></sample-icon>', node => node.cloneNode(false));
    const module = editor.context.modules.componentSelection;
    module.root = editor.editable;
    module.selector = 'sample-icon';
    module.prepare();
    expect(editor.editable.firstChild.contentEditable).toBe('false');
    expect(Editor.prototype.serialize.call(editor)).toBe('<sample-icon name="cart"></sample-icon>');
  });
  it('serializes only the selected text and component', () => {
    const editor = create('<p>Before <sample-icon name="cart"><svg></svg></sample-icon> after</p>', node => node.cloneNode(false));
    const paragraph = editor.editable.firstChild;
    const selection = document.createRange();
    selection.setStart(paragraph.firstChild, 3);
    selection.setEnd(paragraph.lastChild, 3);
    expect(Editor.prototype.serialize.call(editor, selection))
      .toBe('ore <sample-icon name="cart"></sample-icon> af');
  });

  it('does not upgrade custom elements while serializing', () => {
    let constructions = 0;
    const name = 'serialization-test-' + Math.random().toString(36).slice(2);
    customElements.define(name, class extends HTMLElement {
      constructor() { super(); constructions++; }
    });
    const editor = create('<' + name + '></' + name + '>', () => null, [name]);
    const before = constructions;
    Editor.prototype.serialize.call(editor);
    expect(constructions).toBe(before);
  });
});
