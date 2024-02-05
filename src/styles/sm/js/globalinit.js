import $ from "jquery";

let summernote_image_upload_url;

const beautifyOpts = {
  indent_size: 2,
  indent_with_tabs: true,
  indent_char: " ",
  max_preserve_newlines: "2",
  preserve_newlines: true,
  keep_array_indentation: false,
  break_chained_methods: false,
  indent_scripts: "normal",
  brace_style: "collapse",
  space_before_conditional: true,
  unescape_strings: false,
  jslint_happy: false,
  end_with_newline: false,
  wrap_line_length: "140",
  indent_inner_html: true,
  comma_first: false,
  e4x: false,
  indent_empty_lines: false
};

export var summernote_global_config = {
  disableDragAndDrop: false,
  dialogsInBody: true,
  container: 'body',
  dialogsFade: true,
  height: 300,
  prettifyHtml: true,
  popatmouse: true,
  hideArrow: false,
  recordEveryKeystroke: false,
  // TODO: Turn on spellCheck again
  spellCheck: false,
  callbacks: {
    onBlurCodeview(code, e) {
      // Summernote does not update WYSIWYG content on codable blur,
      // only when switched back to editor
      $(this).val(code);
    },
    onFileBrowse(e, mediaType, deferred) {
      Smartstore.media.openFileManager({
        el: e.target,
        type: mediaType,
        backdrop: false,
        onSelect: (files) => {
          if (!files.length) {
            deferred.reject();
          }
          else {
            deferred.resolve(files[0].url);
          }
        }
      });
    },
    onImageUpload(files) {
      if (summernote_image_upload_url) {
        sendFile(files[0], this);
      }   
    },
    onSanitizeHtml(html, opts) {
      if (opts.prettify && window.html_beautify) {
        return window.html_beautify(html, beautifyOpts);
      }
      return html;
    }
  },
  toolbar: [
    ['edit', ['undo', 'redo']],
    ['text', ['bold', 'italic', 'underline', 'moreFontStyles']],
    //['color', ['forecolor', 'backcolor']],
    ['font', ['fontname', 'xcolor', 'fontsize']],
    ['para', ['style', 'cssclass', 'ul', 'ol', 'paragraph', 'clear']],
    ['insert', ['link', 'image', 'video', 'table', 'hr']],
    ['view', ['codeview', 'fullscreen', 'help']]
  ],
  popover: {
    image: [
      ['custom', ['imageAttributes', 'link', 'unlink', 'imageShapes']],
      ['imagesize', ['resizeFull', 'resizeHalf', 'resizeQuarter', 'resizeNone']],
      ['float', ['floatLeft', 'floatRight', 'floatNone']],
      ['remove', ['removeMedia']]
    ],
    link: [
      ['link', ['linkDialogShow', 'unlink']]
    ],
    table: [
      ['add', ['addRowDown', 'addRowUp', 'addColLeft', 'addColRight']],
      ['delete', ['deleteRow', 'deleteCol', 'deleteTable']],
      //['custom', ['tableStyles']]
    ],
    // air: [
    //   ['color', ['color']],
    //   ['font', ['bold', 'underline', 'clear']],
    //   ['para', ['ul', 'paragraph']],
    //   ['table', ['table']],
    //   ['insert', ['link', 'picture']]
    // ]
  },
  styleTags: [
    'p',
    'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
    'pre',
    { title: 'Blockquote', tag: 'blockquote', className: 'blockquote', value: 'blockquote' }
  ],
  codemirror: {
    mode: "htmlmixed",
    theme: "eclipse",
    lineNumbers: true,
    lineWrapping: false,
    tabSize: 2,
    indentWithTabs: true,
    smartIndent: true,
    matchTags: true,
    matchBrackets: true,
    autoCloseTags: true,
    autoCloseBrackets: true,
    styleActiveLine: true,
    extraKeys: {
      "'.'": CodeMirror.hint.completeAfter,
      "'<'": CodeMirror.hint.completeAfter,
      "'/'": CodeMirror.hint.completeIfAfterLt,
      "' '": CodeMirror.hint.completeIfAfterSpace,
      "'='": CodeMirror.hint.completeIfInTag,
      "Ctrl-Space": "autocomplete",
      "F11": function (cm) { cm.setOption("fullScreen", !cm.getOption("fullScreen")); },
      "Esc": function (cm) { if (cm.getOption("fullScreen")) cm.setOption("fullScreen", false); }
    },
    hintOptions: {
      closeCharacters: /[\s()\[\]{};:>,.|%]/,
      completeSingle: false
    }
  },
  imageAttributes: {
    //icon: '<i class="fa fa-pencil"/>',
    removeEmpty: true, // true = remove attributes | false = leave empty if present
    disableUpload: true // true = don't display Upload Options | Display Upload Options
  }
};

function sendFile(file, editor, welEditable) {
  data = new FormData();
  data.append("file", file);
  data.append("a", "UPLOAD");
  data.append("d", "file");
  data.append("ext", true);

  $.ajax({
    data: data,
    type: "POST",
    url: summernote_image_upload_url,
    cache: false,
    contentType: false,
    processData: false,
    success: function (result) {
      if (result.Success) {
        $(editor).summernote('insertImage', result.Url);
      }
      else {
        EventBroker.publish("message", {
          title: 'Image upload error',
          text: result.Message,
          type: 'error',
          hide: false
        });
      }
    }
  });
}
