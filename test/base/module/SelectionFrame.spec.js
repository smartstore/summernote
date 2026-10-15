import { beforeEach, afterEach, describe, it, expect, vi } from 'vitest';
import $ from 'jquery';
import SelectionFrame from '@/js/module/SelectionFrame';

describe('SelectionFrame', () => {
  let frame, area, image, icon, editor;
  beforeEach(() => {
    area = $('<div style="position:relative"><img><sm-icon style="display:inline-block;width:16px;height:16px"></sm-icon></div>').appendTo(document.body);
    image = area.find('img')[0];
    icon = area.find('sm-icon')[0];
    editor = {
      selection: {},
      saveTarget(target) { this.selection.selectedControl = target; },
      clearTarget() { this.selection.selectedControl = null; },
    };
    frame = new SelectionFrame({ modules: { editor }, layoutInfo: { editingArea: area } });
    frame.initialize();
  });
  afterEach(() => { frame.destroy(); area.remove(); });

  it('shares one frame and removes image controls when switching to a component', () => {
    const imageOwner = {}, componentOwner = {};
    const controls = $('<div class="note-control-sizing"></div>');
    frame.show(image, imageOwner, { controls });
    frame.show(icon, componentOwner, { pointerEvents: 'none' });
    frame.hide(imageOwner);
    expect(area.find('.note-control-selection').length).toBe(1);
    expect(frame.$frame.find('.note-control-sizing').length).toBe(0);
    expect(frame.target).toBe(icon);
    expect(editor.selection.selectedControl).toBe(icon);
    frame.show(image, imageOwner, { controls });
    expect(frame.$frame.find('.note-control-sizing').length).toBe(1);
    frame.hide(componentOwner);
    expect(frame.target).toBe(image);
    frame.hide(imageOwner);
    expect(editor.selection.selectedControl).toBeNull();
  });

  it('tracks rendered component size without an explicit update', async () => {
    frame.show(icon, {});
    icon.style.width = '80px';
    icon.style.height = '64px';
    await vi.waitFor(() => {
      expect(frame.$frame[0].style.width).toBe('80px');
      expect(frame.$frame[0].style.height).toBe('64px');
    });
  });

  it('clears a detached selection without clearing a different saved target', () => {
    frame.show(icon, {});
    editor.saveTarget(image);
    icon.remove();
    frame.position();
    expect(frame.target).toBeNull();
    expect(editor.selection.selectedControl).toBe(image);
    expect(frame.$frame[0].style.display).toBe('none');
  });
});
