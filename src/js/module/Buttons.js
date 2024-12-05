import $ from 'jquery';
import func from '../core/func';
import lists from '../core/lists';
import env from '../core/env';
import Obj from '../core/Obj';

export default class Buttons {
  constructor(context) {
    this.ui = $.summernote.ui;
    this.context = context;
    this.$toolbar = context.layoutInfo.toolbar;
    this.options = context.options;
    this.lang = this.options.langInfo;
    this.invertedKeyMap = Obj.invert(
      this.options.keyMap[env.isMac ? 'mac' : 'pc']
    );
  }

  representShortcut(editorMethod) {
    let shortcut = this.invertedKeyMap[editorMethod];
    if (!this.options.shortcuts || !shortcut) {
      return '';
    }

    if (env.isMac) {
      shortcut = shortcut.replace('CMD', '⌘').replace('SHIFT', '⇧');
    }

    shortcut = shortcut.replace('BACKSLASH', '\\')
      .replace('SLASH', '/')
      .replace('LEFTBRACKET', '[')
      .replace('RIGHTBRACKET', ']');

    return ' (' + shortcut + ')';
  }

  button(o) {
    if (!this.options.tooltip && o.tooltip) {
      delete o.tooltip;
    }
    o.container = this.options.container;
    return this.ui.button(o);
  }

  initialize() {
    this.addToolbarButtons();
    this.addImagePopoverButtons();
    this.addLinkPopoverButtons();
    this.addTablePopoverButtons();
    this.fontInstalledMap = {};
  }

  destroy() {
    delete this.fontInstalledMap;
  }

  isFontInstalled(name) {
    if (!Object.prototype.hasOwnProperty.call(this.fontInstalledMap, name)) {
      this.fontInstalledMap[name] = env.isFontInstalled(name) ||
        lists.contains(this.options.fontNamesIgnoreCheck, name);
    }
    return this.fontInstalledMap[name];
  }

  isFontDeservedToAdd(name) {
    name = name.toLowerCase();
    return (name !== '' && this.isFontInstalled(name) && env.genericFontFamilies.indexOf(name) === -1);
  }

  loadCustomColors($holder) {
    const key = 'note:customcolors:' + $holder.data('event');
    const savedColors = localStorage.getItem(key);

    let arr;
    if (savedColors) {
      try {
        arr = JSON.parse(savedColors);
        if (arr.length > 8) {
          arr = arr.slice(-8); // Keep the last 8 elements
        }
      } 
      catch {
        localStorage.removeItem(key);
      }
    }

    return arr || [];
  }

  saveCustomColor($holder, color) {
    const key = 'note:customcolors:' + $holder.data('event');
    const arr = this.loadCustomColors($holder);

    arr.push(color);
    if (arr.length > 8) {
      arr.shift(); // Remove the first (oldest) item if the length exceeds 8
    }

    localStorage.setItem(key, JSON.stringify(arr));

    this.updateCustomColorPalette($holder, arr);
  }

  updateCustomColorPalette($holder, arr) {
    // Make fixed-width array with 8 items and fill gaps with #FFFFFF
    const customColors = [arr.concat(Array(8 - arr.length).fill('#FFFFFF')).slice(0, 8)];
    $holder.html(this.ui.palette({
      colors: customColors,
      colorsName: customColors,
      eventName: $holder.data('event'),
      container: this.options.container,
      //tooltip: this.options.tooltip,
    }).render());

    $holder.find('.note-color-btn').eq(arr.length - 1).addClass('omega');
  }

  colorPalette(className, tooltip, backColor, foreColor) {
    return this.ui.buttonGroup({
      className: 'note-color btn-group-split ' + className,
      children: [
        this.button({
          className: 'note-current-color-button',
          contents: $(this.ui.icon(this.options.icons.paintbrush)).addClass('note-recent-color')[0].outerHTML,
          tooltip: tooltip,
          click: (event) => {
            const $button = $(event.currentTarget);
            if (backColor && foreColor) {
              this.context.invoke('editor.color', {
                backColor: $button.attr('data-backColor'),
                foreColor: $button.attr('data-foreColor'),
              });
            } else if (backColor) {
              this.context.invoke('editor.color', {
                backColor: $button.attr('data-backColor'),
              });
            } else if (foreColor) {
              this.context.invoke('editor.color', {
                foreColor: $button.attr('data-foreColor'),
              });
            }
          },
          callback: ($button) => {
            const $recentColor = $button.find('.note-recent-color');
            if (backColor) {
              $recentColor.css('background-color', this.options.colorButton.backColor);
              $button.attr('data-backColor', this.options.colorButton.backColor);
            }
            if (foreColor) {
              $recentColor.css('color', this.options.colorButton.foreColor);
              $button.attr('data-foreColor', this.options.colorButton.foreColor);
            } else {
              $recentColor.css('color', 'transparent');
            }
          },
        }),
        this.button({
          className: 'dropdown-toggle dropdown-toggle-split',
          contents: this.ui.dropdownButtonContents('', this.options),
          tooltip: this.lang.color.more,
          data: {
            toggle: 'dropdown',
          },
        }),
        this.ui.dropdown({
          items: (backColor ? [
            '<div class="note-palette">',
              '<div class="note-palette-title"><span class="text-truncate">' + this.lang.color.background + '</span>',
                '<button title="' + this.lang.color.transparent + '" data-event="backColor" data-value="transparent" type="button" class="note-color-reset btn btn-clear-dark btn-no-border btn-sm btn-icon ml-auto">',
                  '<i class="far fa-droplet-slash"></i>',
                '</button>',
                '<button title="' + this.lang.color.cpSelect + '" data-event="openPalette" data-value="backColorPicker-'+this.options.id+'" type="button" class="note-color-select btn btn-clear-dark btn-no-border btn-sm btn-icon">',
                  '<i class="fa fa-eye-dropper"></i>',
                '</button>',
                '<input type="color" id="backColorPicker-'+this.options.id+'" class="note-btn note-color-select-btn" value="' + this.options.colorButton.backColor + '" data-event="backColorPalette-'+this.options.id+'">',
              '</div>',
              '<hr class="my-0" />',
              '<div class="note-holder" data-event="backColor"><!-- back colors --></div>',
              '<hr class="my-0" />',
              '<div class="note-holder-custom" id="backColorPalette-'+this.options.id+'" data-event="backColor"></div>',
            '</div>',
          ].join('') : '') +
          (foreColor ? [
            '<div class="note-palette">',
              '<div class="note-palette-title"><span class="text-truncate">' + this.lang.color.foreground + '</span>',
                '<button title="' + this.lang.color.resetToDefault + '" data-event="removeFormat" data-value="foreColor" type="button" class="note-color-reset btn btn-clear-dark btn-no-border btn-sm btn-icon ml-auto">',
                  '<i class="far fa-droplet-slash"></i>',
                '</button>',
                '<button title="' + this.lang.color.cpSelect + '" data-event="openPalette" data-value="foreColorPicker-'+this.options.id+'" type="button" class="note-color-select btn btn-clear-dark btn-no-border btn-sm btn-icon">',
                  '<i class="fa fa-eye-dropper"></i>',
                '</button>',
                '<input type="color" id="foreColorPicker-'+this.options.id+'" class="note-btn note-color-select-btn" value="' + this.options.colorButton.foreColor + '" data-event="foreColorPalette-'+this.options.id+'">',
              '</div>',
              '<hr class="my-0" />',
              '<div class="note-holder" data-event="foreColor"><!-- fore colors --></div>',
              '<hr class="my-0" />',
              '<div class="note-holder-custom" id="foreColorPalette-'+this.options.id+'" data-event="foreColor"></div>',
            '</div>',
          ].join('') : ''),
          callback: ($dropdown) => {
            $dropdown.find('.note-holder').each((idx, item) => {
              const $holder = $(item);
              $holder.append(this.ui.palette({
                colors: this.options.colors,
                colorsName: this.options.colorsName,
                eventName: $holder.data('event'),
                container: this.options.container,
                //tooltip: this.options.tooltip,
              }).render());
            });
            $dropdown.find('.note-holder-custom').each((idx, item) => {
              const $holder = $(item);
              const arr = this.loadCustomColors($holder);
              this.updateCustomColorPalette($holder, arr);
            });
            $dropdown.find('input[type=color]').each((_idx, item) => {
              $(item).on("change", (e) => {
                const input = e.currentTarget;
                const $holder = $dropdown.find('#' + $(input).data('event'));
                const color = input.value.toUpperCase();

                this.saveCustomColor($holder, color);
                this.updateCustomColorPalette($holder, this.loadCustomColors($holder));

                const $chip = $holder.find('.note-color-btn.omega').first();
                $chip.trigger('click');
              });
            });
          },
          click: (event) => {
            event.stopPropagation();
            
            const $parent = $('.' + className).find('.note-dropdown-menu');
            const $button = $(event.target.closest('button'));
            const eventName = $button.data('event');
            const value = $button.attr('data-value');

            console.log(event, eventName, event.target);

            if (eventName === 'openPalette') {
              const $picker = $parent.find('#' + value);
              $picker.trigger('click');
            } 
            else {
              if (lists.contains(['backColor', 'foreColor'], eventName)) {
                const key = eventName === 'backColor' ? 'background-color' : 'color';
                const $color = $button.closest('.note-color').find('.note-recent-color');
                const $currentButton = $button.closest('.note-color').find('.note-current-color-button');

                $color.css(key, value);
                $currentButton.attr('data-' + eventName, value);
              }

              this.context.invoke('editor.' + eventName, value);
            }
          },
        }),
      ],
    }).render();
  }

  addToolbarButtons() {
    this.context.memo('button.style', () => {
      return this.ui.buttonGroup([
        this.button({
          className: 'dropdown-toggle',
          contents: this.ui.dropdownButtonContents(
            this.ui.icon(this.options.icons.paragraph), this.options
          ),
          tooltip: this.lang.style.style,
          data: {
            toggle: 'dropdown',
          },
        }),
        this.ui.dropdown({
          className: 'dropdown-style',
          items: this.options.styleTags,
          title: this.lang.style.style,
          template: (item) => {
            // TBD: need to be simplified
            if (typeof item === 'string') {
              item = {
                tag: item,
                title: (Object.prototype.hasOwnProperty.call(this.lang.style, item) ? this.lang.style[item] : item),
              };
            }

            const tag = item.tag;
            const title = item.title;
            const style = item.style ? ' style="' + item.style + '" ' : '';
            const className = item.className ? ' class="' + item.className + '"' : '';

            return '<' + tag + style + className + '>' + title + '</' + tag + '>';
          },
          click: this.context.createInvokeHandler('editor.formatBlock'),
        }),
      ]).render();
    });

    for (let styleIdx = 0, styleLen = this.options.styleTags.length; styleIdx < styleLen; styleIdx++) {
      const item = this.options.styleTags[styleIdx];

      this.context.memo('button.style.' + item, () => {
        return this.button({
          className: 'note-btn-style-' + item,
          contents: '<div data-value="' + item + '">' + item.toUpperCase() + '</div>',
          tooltip: this.lang.style[item],
          click: this.context.createInvokeHandler('editor.formatBlock'),
        }).render();
      });
    }

    this.context.memo('button.bold', () => {
      return this.button({
        className: 'note-btn-bold',
        contents: this.ui.icon(this.options.icons.bold),
        tooltip: this.lang.font.bold + this.representShortcut('bold'),
        click: this.context.createInvokeHandlerAndUpdateState('editor.bold'),
      }).render();
    });

    this.context.memo('button.italic', () => {
      return this.button({
        className: 'note-btn-italic',
        contents: this.ui.icon(this.options.icons.italic),
        tooltip: this.lang.font.italic + this.representShortcut('italic'),
        click: this.context.createInvokeHandlerAndUpdateState('editor.italic'),
      }).render();
    });

    this.context.memo('button.underline', () => {
      return this.button({
        className: 'note-btn-underline',
        contents: this.ui.icon(this.options.icons.underline),
        tooltip: this.lang.font.underline + this.representShortcut('underline'),
        click: this.context.createInvokeHandlerAndUpdateState('editor.underline'),
      }).render();
    });

    this.context.memo('button.clear', () => {
      return this.button({
        className: 'note-btn-removeformat',
        contents: this.ui.icon(this.options.icons.eraser),
        tooltip: this.lang.font.clear + this.representShortcut('removeFormat'),
        click: this.context.createInvokeHandler('editor.removeFormat'),
      }).render();
    });

    const strikethrough = this.button({
      className: 'note-btn-strikethrough',
      contents: this.ui.icon(this.options.icons.strikethrough),
      tooltip: this.lang.font.strikethrough + this.representShortcut('strikethrough'),
      click: this.context.createInvokeHandlerAndUpdateState('editor.strikethrough'),
    });

    const superscript = this.button({
      className: 'note-btn-superscript',
      contents: this.ui.icon(this.options.icons.superscript),
      tooltip: this.lang.font.superscript,
      click: this.context.createInvokeHandlerAndUpdateState('editor.superscript'),
    });
    
    const subscript = this.button({
      className: 'note-btn-subscript',
      contents: this.ui.icon(this.options.icons.subscript),
      tooltip: this.lang.font.subscript,
      click: this.context.createInvokeHandlerAndUpdateState('editor.subscript'),
    });
    
    const code = this.button({
      className: 'note-btn-inlinecode',
      contents: this.ui.icon(this.options.icons.inlineCode),
      tooltip: this.lang.font.code,
      click: this.context.createInvokeHandlerAndUpdateState('editor.code'),
    });
    
    this.context.memo('button.strikethrough', () => strikethrough.render());
    this.context.memo('button.superscript', () => superscript.render());
    this.context.memo('button.subscript', () => subscript.render());
    this.context.memo('button.inlinecode', () => code.render());

    this.context.memo('button.moreFontStyles', () => {
      return this.ui.buttonGroup([
        this.button({
          className: 'dropdown-toggle no-chevron',
          contents: this.ui.dropdownButtonContents(this.ui.icon(this.options.icons.ellipsis), this.options),
          data: {
            toggle: 'dropdown',
          },
        }),
        this.ui.dropdown({
          className: 'note-toolbar',
          css: { 'min-width': 'auto' },
          items: this.ui.toolGroup({
            className: 'note-more-fontstyles',
            children: [strikethrough, superscript, subscript, code],
          }).render()
        })
      ]).render();
    });

    this.context.memo('button.fontname', () => {
      const styleInfo = this.context.invoke('editor.currentStyle');

      if (this.options.addDefaultFonts) {
        // Add 'default' fonts into the fontnames array if not exist
        if (!lists.isEmpty(styleInfo['font-family'])) {
          $.each(styleInfo['font-family'].split(','), (idx, fontname) => {
            fontname = fontname.trim().replace(/['"]+/g, '');
            if (this.isFontDeservedToAdd(fontname)) {
              if (this.options.fontNames.indexOf(fontname) === -1) {
                this.options.fontNames.push(fontname);
              }
            }
          });
        }
      }

      return this.ui.buttonGroup([
        this.button({
          className: 'dropdown-toggle',
          contents: this.ui.dropdownButtonContents(
            '<span class="note-current-fontname"></span>', this.options
          ),
          tooltip: this.lang.font.name,
          data: {
            toggle: 'dropdown',
          },
        }),
        this.ui.dropdownCheck({
          className: 'dropdown-fontname',
          checkClassName: this.options.icons.menuCheck,
          items: this.options.fontNames.filter(this.isFontInstalled.bind(this)),
          title: this.lang.font.name,
          template: (item) => {
            return '<span style="font-family: ' + env.validFontName(item) + '">' + item + '</span>';
          },
          click: this.context.createInvokeHandlerAndUpdateState('editor.fontName'),
        }),
      ]).render();
    });

    this.context.memo('button.fontsize', () => {
      return this.ui.buttonGroup([
        this.button({
          className: 'dropdown-toggle',
          contents: this.ui.dropdownButtonContents('<span class="note-current-fontsize"></span>', this.options),
          tooltip: this.lang.font.size,
          data: {
            toggle: 'dropdown',
          },
        }),
        this.ui.dropdownCheck({
          className: 'dropdown-fontsize',
          checkClassName: this.options.icons.menuCheck,
          items: this.options.fontSizes,
          title: this.lang.font.size,
          click: this.context.createInvokeHandlerAndUpdateState('editor.fontSize'),
        }),
      ]).render();
    });

    this.context.memo('button.fontsizeunit', () => {
      return this.ui.buttonGroup([
        this.button({
          className: 'dropdown-toggle',
          contents: this.ui.dropdownButtonContents('<span class="note-current-fontsizeunit"></span>', this.options),
          tooltip: this.lang.font.sizeunit,
          data: {
            toggle: 'dropdown',
          },
        }),
        this.ui.dropdownCheck({
          className: 'dropdown-fontsizeunit',
          checkClassName: this.options.icons.menuCheck,
          items: this.options.fontSizeUnits,
          title: this.lang.font.sizeunit,
          click: this.context.createInvokeHandlerAndUpdateState('editor.fontSizeUnit'),
        }),
      ]).render();
    });

    this.context.memo('button.color', () => {
      return this.colorPalette('note-color-all', this.lang.color.recent, true, true);
    });

    this.context.memo('button.forecolor', () => {
      return this.colorPalette('note-color-fore', this.lang.color.foreground, false, true);
    });

    this.context.memo('button.backcolor', () => {
      return this.colorPalette('note-color-back', this.lang.color.background, true, false);
    });

    this.context.memo('button.ul', () => {
      return this.button({
        contents: this.ui.icon(this.options.icons.unorderedlist),
        tooltip: this.lang.lists.unordered + this.representShortcut('insertUnorderedList'),
        click: this.context.createInvokeHandler('editor.insertUnorderedList'),
      }).render();
    });

    this.context.memo('button.ol', () => {
      return this.button({
        contents: this.ui.icon(this.options.icons.orderedlist),
        tooltip: this.lang.lists.ordered + this.representShortcut('insertOrderedList'),
        click: this.context.createInvokeHandler('editor.insertOrderedList'),
      }).render();
    });

    const justifyLeft = this.button({
      contents: this.ui.icon(this.options.icons.alignLeft),
      tooltip: this.lang.paragraph.left + this.representShortcut('justifyLeft'),
      click: this.context.createInvokeHandler('editor.justifyLeft'),
    });

    const justifyCenter = this.button({
      contents: this.ui.icon(this.options.icons.alignCenter),
      tooltip: this.lang.paragraph.center + this.representShortcut('justifyCenter'),
      click: this.context.createInvokeHandler('editor.justifyCenter'),
    });

    const justifyRight = this.button({
      contents: this.ui.icon(this.options.icons.alignRight),
      tooltip: this.lang.paragraph.right + this.representShortcut('justifyRight'),
      click: this.context.createInvokeHandler('editor.justifyRight'),
    });

    const justifyFull = this.button({
      contents: this.ui.icon(this.options.icons.alignJustify),
      tooltip: this.lang.paragraph.justify + this.representShortcut('justifyFull'),
      click: this.context.createInvokeHandler('editor.justifyFull'),
    });

    const outdent = this.button({
      contents: this.ui.icon(this.options.icons.outdent),
      tooltip: this.lang.paragraph.outdent + this.representShortcut('outdent'),
      click: this.context.createInvokeHandler('editor.outdent'),
    });

    const indent = this.button({
      contents: this.ui.icon(this.options.icons.indent),
      tooltip: this.lang.paragraph.indent + this.representShortcut('indent'),
      click: this.context.createInvokeHandler('editor.indent'),
    });

    this.context.memo('button.justifyLeft', func.invoke(justifyLeft, 'render'));
    this.context.memo('button.justifyCenter', func.invoke(justifyCenter, 'render'));
    this.context.memo('button.justifyRight', func.invoke(justifyRight, 'render'));
    this.context.memo('button.justifyFull', func.invoke(justifyFull, 'render'));
    this.context.memo('button.outdent', func.invoke(outdent, 'render'));
    this.context.memo('button.indent', func.invoke(indent, 'render'));

    this.context.memo('button.paragraph', () => {
      return this.ui.buttonGroup([
        this.button({
          className: 'dropdown-toggle',
          contents: this.ui.dropdownButtonContents(this.ui.icon(this.options.icons.alignLeft), this.options),
          tooltip: this.lang.paragraph.paragraph,
          data: {
            toggle: 'dropdown',
          },
        }),
        this.ui.dropdown({          
          className: 'note-toolbar',
          css: { 'min-width': 'auto' },
          children: [
            this.ui.toolGroup({
              className: 'note-align',
              children: [justifyLeft, justifyCenter, justifyRight, justifyFull],
            }),
            this.ui.toolGroup({
              className: 'note-list',
              children: [outdent, indent],
            })
          ]
        })
      ]).render();
    });

    this.context.memo('button.height', () => {
      return this.ui.buttonGroup([
        this.button({
          className: 'dropdown-toggle',
          contents: this.ui.dropdownButtonContents(this.ui.icon(this.options.icons.textHeight), this.options),
          tooltip: this.lang.font.height,
          data: {
            toggle: 'dropdown',
          },
        }),
        this.ui.dropdownCheck({
          items: this.options.lineHeights,
          checkClassName: this.options.icons.menuCheck,
          className: 'dropdown-line-height',
          title: this.lang.font.height,
          click: this.context.createInvokeHandler('editor.lineHeight'),
        }),
      ]).render();
    });

    this.context.memo('button.table', () => {
      return this.ui.buttonGroup([
        this.button({
          className: 'dropdown-toggle',
          contents: this.ui.dropdownButtonContents(this.ui.icon(this.options.icons.table), this.options),
          tooltip: this.lang.table.table,
          data: {
            toggle: 'dropdown',
          },
        }),
        this.ui.dropdown({
          title: this.lang.table.table,
          className: 'note-table',
          items: [
            '<div class="note-dimension-picker">',
              '<div class="note-dimension-picker-mousecatcher" data-event="insertTable" data-value="1x1"></div>',
              '<div class="note-dimension-picker-highlighted"></div>',
              '<div class="note-dimension-picker-unhighlighted"></div>',
            '</div>',
            '<div class="note-dimension-display text-center fwm">1 x 1</div>',
          ].join(''),
        }),
      ], {
        callback: ($node) => {
          const $catcher = $node.find('.note-dimension-picker-mousecatcher');
          $catcher.css({
            width: this.options.insertTableMaxSize.col + 'em',
            height: this.options.insertTableMaxSize.row + 'em',
          }).on('mousedown', this.context.createInvokeHandler('editor.insertTable'))
            .on('mousemove', this.tableMoveHandler.bind(this));
        },
      }).render();
    });

    this.context.memo('button.link', () => {
      return this.button({
        contents: this.ui.icon(this.options.icons.link),
        tooltip: this.lang.link.link + this.representShortcut('linkDialog.show'),
        click: this.context.createInvokeHandler('linkDialog.show'),
      }).render();
    });

    this.context.memo('button.image', () => {
      return this.button({
        contents: this.ui.icon(this.options.icons.picture),
        tooltip: this.lang.image.image,
        click: this.context.createInvokeHandler('imageDialog.show'),
      }).render();
    });

    this.context.memo('button.video', () => {
      return this.button({
        contents: this.ui.icon(this.options.icons.video),
        tooltip: this.lang.video.video,
        click: this.context.createInvokeHandler('videoDialog.show'),
      }).render();
    });

    this.context.memo('button.hr', () => {
      return this.button({
        contents: this.ui.icon(this.options.icons.minus),
        tooltip: this.lang.hr.insert + this.representShortcut('insertHorizontalRule'),
        click: this.context.createInvokeHandler('editor.insertHorizontalRule'),
      }).render();
    });

    this.context.memo('button.fullscreen', () => {
      return this.button({
        className: 'btn-fullscreen note-codeview-keep',
        contents: this.ui.icon(this.options.icons.arrowsAlt),
        tooltip: this.lang.options.fullscreen,
        click: this.context.createInvokeHandler('fullscreen.toggle'),
      }).render();
    });

    this.context.memo('button.codeview', () => {
      return this.button({
        className: 'btn-codeview note-codeview-keep',
        contents: this.ui.icon(this.options.icons.code),
        tooltip: this.lang.options.codeview,
        click: this.context.createInvokeHandler('codeview.toggle'),
      }).render();
    });

    this.context.memo('button.redo', () => {
      return this.button({
        className: 'note-redo disabled',
        contents: this.ui.icon(this.options.icons.redo),
        tooltip: this.lang.history.redo + this.representShortcut('redo'),
        click: this.context.createInvokeHandler('editor.redo'),
      }).render();
    });

    this.context.memo('button.undo', () => {
      return this.button({
        className: 'note-undo disabled',
        contents: this.ui.icon(this.options.icons.undo),
        tooltip: this.lang.history.undo + this.representShortcut('undo'),
        click: this.context.createInvokeHandler('editor.undo'),
      }).render();
    });

    this.context.memo('button.help', () => {
      return this.button({
        contents: this.ui.icon(this.options.icons.question),
        tooltip: this.lang.options.help,
        click: this.context.createInvokeHandler('helpDialog.show'),
      }).render();
    });
  }

  /**
   * image: [
   *   ['imageResize', ['resizeFull', 'resizeHalf', 'resizeQuarter', 'resizeNone']],
   *   ['float', ['floatLeft', 'floatRight', 'floatNone']],
   *   ['remove', ['removeMedia']],
   * ],
   */
  addImagePopoverButtons() {
    // Image Size Buttons
    this.context.memo('button.resizeFull', () => {
      return this.button({
        contents: '<span class="note-fontsize-10">100%</span>',
        tooltip: this.lang.image.resizeFull,
        click: this.context.createInvokeHandler('editor.resize', '1'),
      }).render();
    });
    this.context.memo('button.resizeHalf', () => {
      return this.button({
        contents: '<span class="note-fontsize-10">50%</span>',
        tooltip: this.lang.image.resizeHalf,
        click: this.context.createInvokeHandler('editor.resize', '0.5'),
      }).render();
    });
    this.context.memo('button.resizeQuarter', () => {
      return this.button({
        contents: '<span class="note-fontsize-10">25%</span>',
        tooltip: this.lang.image.resizeQuarter,
        click: this.context.createInvokeHandler('editor.resize', '0.25'),
      }).render();
    });
    this.context.memo('button.resizeNone', () => {
      return this.button({
        contents: this.ui.icon(this.options.icons.rollback),
        tooltip: this.lang.image.resizeNone,
        click: this.context.createInvokeHandler('editor.resize', '0'),
      }).render();
    });

    // Float Buttons
    this.context.memo('button.floatLeft', () => {
      return this.button({
        contents: this.ui.icon(this.options.icons.floatLeft),
        tooltip: this.lang.image.floatLeft,
        click: this.context.createInvokeHandler('editor.floatMe', 'left'),
      }).render();
    });

    this.context.memo('button.floatRight', () => {
      return this.button({
        contents: this.ui.icon(this.options.icons.floatRight),
        tooltip: this.lang.image.floatRight,
        click: this.context.createInvokeHandler('editor.floatMe', 'right'),
      }).render();
    });

    this.context.memo('button.floatNone', () => {
      return this.button({
        contents: this.ui.icon(this.options.icons.floatNone),
        tooltip: this.lang.image.floatNone,
        click: this.context.createInvokeHandler('editor.floatMe', 'none'),
      }).render();
    });

    // Remove Buttons
    this.context.memo('button.removeMedia', () => {
      return this.button({
        contents: this.ui.icon(this.options.icons.trash),
        tooltip: this.lang.image.remove,
        click: this.context.createInvokeHandler('editor.removeMedia'),
      }).render();
    });
  }

  addLinkPopoverButtons() {
    this.context.memo('button.linkDialogShow', () => {
      return this.button({
        contents: this.ui.icon(this.options.icons.link),
        tooltip: this.lang.link.edit,
        click: this.context.createInvokeHandler('linkDialog.show'),
      }).render();
    });

    this.context.memo('button.unlink', () => {
      return this.button({
        className: 'note-unlink',
        contents: this.ui.icon(this.options.icons.unlink),
        tooltip: this.lang.link.unlink,
        click: this.context.createInvokeHandler('editor.unlink'),
      }).render();
    });
  }

  /**
   * table : [
   *  ['add', ['addRowDown', 'addRowUp', 'addColLeft', 'addColRight']],
   *  ['delete', ['deleteRow', 'deleteCol', 'deleteTable']]
   * ],
   */
  addTablePopoverButtons() {
    this.context.memo('button.addRowUp', () => {
      return this.button({
        className: 'btn-md',
        contents: this.ui.icon(this.options.icons.rowAbove),
        tooltip: this.lang.table.addRowAbove,
        click: this.context.createInvokeHandler('editor.addRow', 'top'),
      }).render();
    });
    this.context.memo('button.addRowDown', () => {
      return this.button({
        className: 'btn-md',
        contents: this.ui.icon(this.options.icons.rowBelow),
        tooltip: this.lang.table.addRowBelow,
        click: this.context.createInvokeHandler('editor.addRow', 'bottom'),
      }).render();
    });
    this.context.memo('button.addColLeft', () => {
      return this.button({
        className: 'btn-md',
        contents: this.ui.icon(this.options.icons.colBefore),
        tooltip: this.lang.table.addColLeft,
        click: this.context.createInvokeHandler('editor.addCol', 'left'),
      }).render();
    });
    this.context.memo('button.addColRight', () => {
      return this.button({
        className: 'btn-md',
        contents: this.ui.icon(this.options.icons.colAfter),
        tooltip: this.lang.table.addColRight,
        click: this.context.createInvokeHandler('editor.addCol', 'right'),
      }).render();
    });
    this.context.memo('button.deleteRow', () => {
      return this.button({
        className: 'btn-md',
        contents: this.ui.icon(this.options.icons.rowRemove),
        tooltip: this.lang.table.delRow,
        click: this.context.createInvokeHandler('editor.deleteRow'),
      }).render();
    });
    this.context.memo('button.deleteCol', () => {
      return this.button({
        className: 'btn-md',
        contents: this.ui.icon(this.options.icons.colRemove),
        tooltip: this.lang.table.delCol,
        click: this.context.createInvokeHandler('editor.deleteCol'),
      }).render();
    });
    this.context.memo('button.deleteTable', () => {
      return this.button({
        className: 'btn-md',
        contents: this.ui.icon(this.options.icons.trash),
        tooltip: this.lang.table.delTable,
        click: this.context.createInvokeHandler('editor.deleteTable'),
      }).render();
    });
  }

  build($container, groups) {
    for (let groupIdx = 0, groupLen = groups.length; groupIdx < groupLen; groupIdx++) {
      const group = groups[groupIdx];
      const groupName = Array.isArray(group) ? group[0] : group;
      const buttons = Array.isArray(group) ? ((group.length === 1) ? [group[0]] : group[1]) : [group];

      const $group = this.ui.toolGroup({
        className: 'note-' + groupName,
      }).render();

      for (let idx = 0, len = buttons.length; idx < len; idx++) {
        const btn = this.context.memo('button.' + buttons[idx]);
        if (btn) {
          $group.append(typeof btn === 'function' ? btn(this.context) : btn);
        }
      }
      $group.appendTo($container);
    }
  }

  /**
   * @param {jQuery} [$container]
   */
  updateCurrentStyle($container) {
    const $cont = $container || this.$toolbar;

    const styleInfo = this.context.invoke('editor.currentStyle');
    this.updateBtnStates($cont, {
      '.note-btn-bold': () => {
        return styleInfo['font-bold'] === 'bold';
      },
      '.note-btn-italic': () => {
        return styleInfo['font-italic'] === 'italic';
      },
      '.note-btn-underline': () => {
        return styleInfo['font-underline'] === 'underline';
      },
      '.note-btn-subscript': () => {
        return styleInfo['font-subscript'] === 'subscript';
      },
      '.note-btn-superscript': () => {
        return styleInfo['font-superscript'] === 'superscript';
      },
      '.note-btn-strikethrough': () => {
        return styleInfo['font-strikethrough'] === 'strikethrough';
      },
      '.note-btn-inlinecode': () => {
        return styleInfo['font-code'] === 'code';
      },
    });

    if (styleInfo['font-family']) {
      const fontNames = styleInfo['font-family'].split(',').map((name) => {
        return name.replace(/[\'\"]/g, '')
          .replace(/\s+$/, '')
          .replace(/^\s+/, '');
      });
      const fontName = lists.find(fontNames, this.isFontInstalled.bind(this));

      $cont.find('.dropdown-fontname a').each((idx, item) => {
        const $item = $(item);
        // always compare string to avoid creating another func.
        const isChecked = ($item.data('value') + '') === (fontName + '');
        $item.toggleClass('checked', isChecked);
      });
      $cont.find('.note-current-fontname').text(fontName).css('font-family', fontName).removeClass('text-muted');
    }
    else {
      $cont.find('.note-current-fontname').text('Standard').css('font-family', '').addClass('text-muted');
    }

    if (styleInfo['font-size']) {
      const fontSize = styleInfo['font-size'];
      $cont.find('.dropdown-fontsize a').each((idx, item) => {
        const $item = $(item);
        // always compare with string to avoid creating another func.
        const isChecked = ($item.data('value') + '') === (fontSize + '');
        $item.toggleClass('checked', isChecked);
      });
      $cont.find('.note-current-fontsize').text(fontSize);

      const fontSizeUnit = styleInfo['font-size-unit'];
      $cont.find('.dropdown-fontsizeunit a').each((idx, item) => {
        const $item = $(item);
        const isChecked = ($item.data('value') + '') === (fontSizeUnit + '');
        $item.toggleClass('checked', isChecked);
      });
      $cont.find('.note-current-fontsizeunit').text(fontSizeUnit);
    }

    if (styleInfo['line-height']) {
      const lineHeight = styleInfo['line-height'];
      $cont.find('.dropdown-line-height a').each((idx, item) => {
        const $item = $(item);
        // always compare with string to avoid creating another func.
        const isChecked = ($(item).data('value') + '') === (lineHeight + '');
        $item.toggleClass('checked', isChecked);
      });
      $cont.find('.note-current-line-height').text(lineHeight);
    }
  }

  updateBtnStates($container, infos) {
    $.each(infos, (selector, pred) => {
      this.ui.toggleBtnActive($container.find(selector), pred());
    });
  }

  tableMoveHandler(event) {
    const PX_PER_EM = 18;
    const $picker = $(event.target.parentNode); // target is mousecatcher
    const $dimensionDisplay = $picker.next();
    const $catcher = $picker.find('.note-dimension-picker-mousecatcher');
    const $highlighted = $picker.find('.note-dimension-picker-highlighted');
    const $unhighlighted = $picker.find('.note-dimension-picker-unhighlighted');

    let posOffset;
    // HTML5 with jQuery - e.offsetX is undefined in Firefox
    if (event.offsetX === undefined) {
      const posCatcher = $(event.target).offset();
      posOffset = {
        x: event.pageX - posCatcher.left,
        y: event.pageY - posCatcher.top,
      };
    } else {
      posOffset = {
        x: event.offsetX,
        y: event.offsetY,
      };
    }

    const dim = {
      c: Math.ceil(posOffset.x / PX_PER_EM) || 1,
      r: Math.ceil(posOffset.y / PX_PER_EM) || 1,
    };

    $highlighted.css({ width: dim.c + 'em', height: dim.r + 'em' });
    $catcher.data('value', dim.c + 'x' + dim.r);

    if (dim.c > 3 && dim.c < this.options.insertTableMaxSize.col) {
      $unhighlighted.css({ width: dim.c + 1 + 'em' });
    }

    if (dim.r > 3 && dim.r < this.options.insertTableMaxSize.row) {
      $unhighlighted.css({ height: dim.r + 1 + 'em' });
    }

    $dimensionDisplay.html(dim.c + ' x ' + dim.r);
  }
}
