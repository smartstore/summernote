import $ from 'jquery';

export default class Dropzone {
  constructor(context) {
    this.context = context;
    this.$eventListener = $(document);
    this.$editor = context.layoutInfo.editor;
    this.$editable = context.layoutInfo.editable;
    this.options = context.options;
    this.lang = this.options.langInfo;
    this.documentEventHandlers = {};

    this.$dropzone = $([
      '<div class="note-dropzone">',
        '<div class="note-dropzone-message"></div>',
      '</div>',
    ].join('')).prependTo(this.$editor);
  }

  /**
   * attach Drag and Drop Events
   */
  initialize() {
    if (this.options.disableDragAndDrop) {
      // prevent default drop event
      this.documentEventHandlers.onDrop = (e) => {
        e.preventDefault();
      };
      // do not consider outside of dropzone
      this.$eventListener = this.$dropzone;
      this.$eventListener.on('drop', this.documentEventHandlers.onDrop);
    } else {
      this.attachDragAndDropEvent();
    }
  }

  /**
   * attach Drag and Drop Events
   */
  attachDragAndDropEvent() {
    let collection = $();
    const $dropzoneMessage = this.$dropzone.find('.note-dropzone-message');

    this.documentEventHandlers.onDragenter = (e) => {
      const isCodeview = this.context.invoke('codeview.isActivated');
      const hasEditorSize = this.$editor.width() > 0 && this.$editor.height() > 0;
      if (!isCodeview && !collection.length && hasEditorSize) {
        this.$editor.addClass('dragover');
        this.$dropzone.width(this.$editor.width());
        this.$dropzone.height(this.$editor.height());
        $dropzoneMessage.text(this.lang.image.dragImageHere);
      }
      collection = collection.add(e.target);
    };

    this.documentEventHandlers.onDragleave = (e) => {
      collection = collection.not(e.target);

      // If nodeName is BODY, then just make it over (fix for IE)
      if (!collection.length || e.target.nodeName === 'BODY') {
        collection = $();
        this.$editor.removeClass('dragover');
      }
    };

    this.documentEventHandlers.onDrop = () => {
      collection = $();
      this.$editor.removeClass('dragover');
    };

    // show dropzone on dragenter when dragging a object to document
    // -but only if the editor is visible, i.e. has a positive width and height
    this.$eventListener.on('dragenter', this.documentEventHandlers.onDragenter)
      .on('dragleave', this.documentEventHandlers.onDragleave)
      .on('drop', this.documentEventHandlers.onDrop);

    // change dropzone's message on hover.
    this.$dropzone.on('dragenter', () => {
      this.$dropzone.addClass('hover');
      $dropzoneMessage.text(this.lang.image.dropImage);
    }).on('dragleave', () => {
      this.$dropzone.removeClass('hover');
      $dropzoneMessage.text(this.lang.image.dragImageHere);
    });

    // attach dropImage
    this.$dropzone.on('drop', (e) => {
      const data = e.originalEvent.dataTransfer;
      // Invoke Clipboard.paste
      const preventDefault = this.context.invoke('clipboard.paste', data, true);
      if (preventDefault) {
        // Prevent default drop/paste behavior if paste was handled
        e.preventDefault();
      }
    }).on('dragover', false); // prevent default dragover event
  }

  destroy() {
    Object.keys(this.documentEventHandlers).forEach((key) => {
      this.$eventListener.off(key.slice(2).toLowerCase(), this.documentEventHandlers[key]);
    });
    this.documentEventHandlers = {};
  }
}
