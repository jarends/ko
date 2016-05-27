(function() {
  var $, Editor, clamp, clipboard, html, keyinfo, log, tools, undo,
    bind = function(fn, me){ return function(){ return fn.apply(me, arguments); }; };

  undo = require('./undo');

  html = require('./html');

  log = require('./tools/log');

  tools = require('./tools/tools');

  keyinfo = require('./tools/keyinfo');

  clipboard = require('electron').clipboard;

  clamp = tools.clamp;

  $ = tools.$;

  Editor = (function() {
    function Editor(elem, className) {
      this.onKeyDown = bind(this.onKeyDown, this);
      this.update = bind(this.update, this);
      this.rangeForWordAtPos = bind(this.rangeForWordAtPos, this);
      this.clampPos = bind(this.clampPos, this);
      this.cursorPos = bind(this.cursorPos, this);
      this.posForEvent = bind(this.posForEvent, this);
      this.lastPos = bind(this.lastPos, this);
      this.selectedText = bind(this.selectedText, this);
      this.text = bind(this.text, this);
      this.deleteBackward = bind(this.deleteBackward, this);
      this.deleteForward = bind(this.deleteForward, this);
      this.deleteSelection = bind(this.deleteSelection, this);
      this.deleteCharacterRangeInLineAtIndex = bind(this.deleteCharacterRangeInLineAtIndex, this);
      this.deleteLineAtIndex = bind(this.deleteLineAtIndex, this);
      this.joinLine = bind(this.joinLine, this);
      this.insertText = bind(this.insertText, this);
      this.insertNewline = bind(this.insertNewline, this);
      this.insertTab = bind(this.insertTab, this);
      this.insertCharacter = bind(this.insertCharacter, this);
      this.deIndent = bind(this.deIndent, this);
      this.deIndentLineAtIndex = bind(this.deIndentLineAtIndex, this);
      this.indentLineAtIndex = bind(this.indentLineAtIndex, this);
      this.indentString = bind(this.indentString, this);
      this.moveCursor = bind(this.moveCursor, this);
      this.moveCursorLeft = bind(this.moveCursorLeft, this);
      this.moveCursorRight = bind(this.moveCursorRight, this);
      this.moveCursorDown = bind(this.moveCursorDown, this);
      this.moveCursorUp = bind(this.moveCursorUp, this);
      this.moveCursorToStartOfLine = bind(this.moveCursorToStartOfLine, this);
      this.moveCursorToEndOfLine = bind(this.moveCursorToEndOfLine, this);
      this.moveCursorToPos = bind(this.moveCursorToPos, this);
      this.setCursor = bind(this.setCursor, this);
      this.cursorInFirstLine = bind(this.cursorInFirstLine, this);
      this.cursorInLastLine = bind(this.cursorInLastLine, this);
      this.cursorAtStartOfLine = bind(this.cursorAtStartOfLine, this);
      this.cursorAtEndOfLine = bind(this.cursorAtEndOfLine, this);
      this.selectedCharacterRangeForLineAtIndex = bind(this.selectedCharacterRangeForLineAtIndex, this);
      this.selectedTextForLineAtIndex = bind(this.selectedTextForLineAtIndex, this);
      this.selectedLines = bind(this.selectedLines, this);
      this.selectedLineRange = bind(this.selectedLineRange, this);
      this.selectedLineIndices = bind(this.selectedLineIndices, this);
      this.selectionStart = bind(this.selectionStart, this);
      this.selectionRanges = bind(this.selectionRanges, this);
      this.endSelection = bind(this.endSelection, this);
      this.startSelection = bind(this.startSelection, this);
      this.selectAll = bind(this.selectAll, this);
      this.selectRange = bind(this.selectRange, this);
      this.setSelection = bind(this.setSelection, this);
      this.selectNone = bind(this.selectNone, this);
      this.initCharSize = bind(this.initCharSize, this);
      this.done = bind(this.done, this);
      this["do"] = new undo(this.done);
      this.cursor = [0, 0];
      this.selection = null;
      this.lines = [""];
      this.elem = elem;
      this.clss = className;
      this.initCharSize();
      this.elem.onkeydown = this.onKeyDown;
      this.elem.innerHTML = html.cursorSpan(this.charSize);
    }

    Editor.prototype.done = function() {
      return setTimeout(this.update, 0);
    };

    Editor.prototype.initCharSize = function() {
      var o;
      o = document.createElement('div');
      o.className = this.clss;
      o.innerHTML = 'XXXXXXXXXX';
      o.style = {
        float: 'left',
        visibility: 'hidden'
      };
      document.body.appendChild(o);
      this.charSize = [o.clientWidth / o.innerHTML.length, o.clientHeight];
      return o.remove();
    };

    Editor.prototype.selectNone = function() {
      return this.selection = this["do"].selection(this.selection, null);
    };

    Editor.prototype.setSelection = function(c, l) {
      return this.selection = this["do"].selection(this.selection, [c, l]);
    };

    Editor.prototype.selectRange = function(range) {
      this.setSelection(range[0][0], range[0][1]);
      return this.setCursor(range[1][0], range[1][1]);
    };

    Editor.prototype.selectAll = function() {
      return this.selectRange([[0, 0], this.lastPos()]);
    };

    Editor.prototype.startSelection = function(active) {
      if (active && (this.selection == null)) {
        return this.selectRange([[Math.min(this.cursor[0], this.lines[this.cursor[1]].length), this.cursor[1]], this.cursor]);
      }
    };

    Editor.prototype.endSelection = function(active) {
      if ((this.selection != null) && !active) {
        return this.selectNone();
      } else {
        return this.update();
      }
    };

    Editor.prototype.selectionRanges = function() {
      var i, range, rgs;
      if (this.selection) {
        range = this.selectedLineRange();
        return rgs = (function() {
          var j, ref, ref1, results;
          results = [];
          for (i = j = ref = range[0], ref1 = range[1]; ref <= ref1 ? j <= ref1 : j >= ref1; i = ref <= ref1 ? ++j : --j) {
            results.push([i, this.selectedCharacterRangeForLineAtIndex(i)]);
          }
          return results;
        }).call(this);
      } else {
        return [];
      }
    };

    Editor.prototype.selectionStart = function() {
      if (this.selection != null) {
        if (this.selection[1] < this.cursor[1]) {
          return [this.selection[0], this.selection[1]];
        }
        if (this.selection[1] > this.cursor[1]) {
          return [Math.min(this.cursor[0], this.lines[this.cursor[1]].length), this.cursor[1]];
        }
        return [Math.min(this.selection[0], this.cursor[0]), this.cursor[1]];
      }
      return [Math.min(this.cursor[0], this.lines[this.cursor[1]].length), this.cursor[1]];
    };

    Editor.prototype.selectedLineIndices = function() {
      var i, j, range, ref, ref1, results;
      range = this.selectedLineRange();
      results = [];
      for (i = j = ref = range[0], ref1 = range[1]; ref <= ref1 ? j <= ref1 : j >= ref1; i = ref <= ref1 ? ++j : --j) {
        results.push(i);
      }
      return results;
    };

    Editor.prototype.selectedLineRange = function() {
      if (this.selection) {
        return [Math.min(this.cursor[1], this.selection[1]), Math.max(this.cursor[1], this.selection[1])];
      }
    };

    Editor.prototype.selectedLines = function() {
      var i, j, len, ref, s;
      s = [];
      ref = this.selectedLineIndices();
      for (j = 0, len = ref.length; j < len; j++) {
        i = ref[j];
        s.push(this.selectedTextForLineAtIndex(i));
        i += 1;
      }
      return s;
    };

    Editor.prototype.selectedTextForLineAtIndex = function(i) {
      var r;
      r = this.selectedCharacterRangeForLineAtIndex(i);
      if (r != null) {
        return this.lines[i].substr(r[0], r[1] - r[0]);
      }
      return '';
    };

    Editor.prototype.selectedCharacterRangeForLineAtIndex = function(i) {
      var curPos, lines;
      if (!this.selection) {
        return;
      }
      lines = this.selectedLineRange();
      if (i < lines[0] || i > lines[1]) {
        return;
      }
      if ((lines[0] < i && i < lines[1])) {
        return [0, this.lines[i].length];
      }
      curPos = this.cursorPos();
      if (lines[0] === lines[1]) {
        return [Math.min(curPos[0], this.selection[0]), Math.max(curPos[0], this.selection[0])];
      }
      if (i === this.cursor[1]) {
        if (this.selection[1] > i) {
          return [curPos[0], this.lines[i].length];
        } else {
          return [0, Math.min(this.lines[i].length, curPos[0])];
        }
      } else {
        if (curPos[1] > i) {
          return [this.selection[0], this.lines[i].length];
        } else {
          return [0, Math.min(this.lines[i].length, this.selection[0])];
        }
      }
    };

    Editor.prototype.cursorAtEndOfLine = function() {
      return this.cursor[0] === this.lines[this.cursor[1]].length;
    };

    Editor.prototype.cursorAtStartOfLine = function() {
      return this.cursor[0] === 0;
    };

    Editor.prototype.cursorInLastLine = function() {
      return this.cursor[1] === this.lines.length - 1;
    };

    Editor.prototype.cursorInFirstLine = function() {
      return this.cursor[1] === 0;
    };

    Editor.prototype.setCursor = function(c, l) {
      l = Math.min(l, this.lines.length - 1);
      c = Math.min(c, this.lines[l].length);
      return this["do"].cursor(this.cursor, [c, l]);
    };

    Editor.prototype.moveCursorToPos = function(pos) {
      return this.setCursor(pos[0], pos[1]);
    };

    Editor.prototype.moveCursorToEndOfLine = function() {
      return this.setCursor(this.lines[this.cursor[1]].length, this.cursor[1]);
    };

    Editor.prototype.moveCursorToStartOfLine = function() {
      return this.setCursor(0, this.cursor[1]);
    };

    Editor.prototype.moveCursorUp = function() {
      if (this.cursorInFirstLine()) {
        return this.moveCursorToStartOfLine();
      } else {
        return this["do"].cursor(this.cursor, [this.cursor[0], this.cursor[1] - 1]);
      }
    };

    Editor.prototype.moveCursorDown = function() {
      if (this.cursorInLastLine()) {
        return this.moveCursorToEndOfLine();
      } else {
        return this["do"].cursor(this.cursor, [this.cursor[0], this.cursor[1] + 1]);
      }
    };

    Editor.prototype.moveCursorRight = function() {
      if (this.cursorAtEndOfLine()) {
        if (!this.cursorInLastLine()) {
          this.moveCursorDown();
          return this.moveCursorToStartOfLine();
        }
      } else {
        return this.setCursor(this.cursor[0] + 1, this.cursor[1]);
      }
    };

    Editor.prototype.moveCursorLeft = function() {
      this.setCursor(this.cursor[0], this.cursor[1]);
      if (this.cursorAtStartOfLine()) {
        if (!this.cursorInFirstLine()) {
          this.moveCursorUp();
          return this.moveCursorToEndOfLine();
        }
      } else {
        return this.setCursor(this.cursor[0] - 1, this.cursor[1]);
      }
    };

    Editor.prototype.moveCursor = function(direction) {
      switch (direction) {
        case 'left':
          return this.moveCursorLeft();
        case 'right':
          return this.moveCursorRight();
        case 'up':
          return this.moveCursorUp();
        case 'down':
          return this.moveCursorDown();
      }
    };

    Editor.prototype.indentString = function() {
      return '    ';
    };

    Editor.prototype.indentLineAtIndex = function(i) {
      var indent, ref;
      this["do"].start();
      indent = this.indentString();
      this["do"].change(this.lines, i, indent + this.lines[i]);
      if ((this.cursor[1] === i) && this.cursor[0] > 0) {
        this.setCursor(this.cursor[0] + indent.length, this.cursor[1]);
      }
      if ((((ref = this.selection) != null ? ref[1] : void 0) === i) && this.selection[0] > 0) {
        this.setSelection(this.selection[0] + indent.length, this.selection[1]);
      }
      return this["do"].end();
    };

    Editor.prototype.deIndentLineAtIndex = function(i) {
      var indent, ref;
      this["do"].start();
      indent = this.indentString();
      if (this.lines[i].startsWith(indent)) {
        this["do"].change(this.lines, i, this.lines[i].substr(indent.length));
        if ((this.cursor[1] === i) && this.cursor[0] > 0) {
          this.setCursor(Math.max(0, this.cursor[0] - indent.length, this.cursor[1]));
        }
        if ((((ref = this.selection) != null ? ref[1] : void 0) === i) && this.selection[0] > 0) {
          this.setSelection(Math.max(0, this.selection[0] - indent.length, this.selection[1]));
        }
      }
      return this["do"].end();
    };

    Editor.prototype.deIndent = function() {
      var i, j, len, ref;
      this["do"].start();
      if (this.selection != null) {
        ref = this.selectedLineIndices();
        for (j = 0, len = ref.length; j < len; j++) {
          i = ref[j];
          this.deIndentLineAtIndex(i);
        }
      } else {
        this.deIndentLineAtIndex(this.cursor[1]);
      }
      return this["do"].end();
    };

    Editor.prototype.insertCharacter = function(c) {
      this["do"].start();
      this.deleteSelection();
      this["do"].change(this.lines, this.cursor[1], this.lines[this.cursor[1]].splice(this.cursor[0], 0, c));
      this.setCursor(this.cursor[0] + 1, this.cursor[1]);
      return this["do"].end();
    };

    Editor.prototype.insertTab = function() {
      var i, il, j, k, len, ref, ref1;
      this["do"].start();
      if (this.selection != null) {
        ref = this.selectedLineIndices();
        for (j = 0, len = ref.length; j < len; j++) {
          i = ref[j];
          this.indentLineAtIndex(i);
        }
      } else {
        il = this.indentString().length;
        for (i = k = 0, ref1 = 4 - (this.cursor[0] % il); 0 <= ref1 ? k < ref1 : k > ref1; i = 0 <= ref1 ? ++k : --k) {
          this.insertCharacter(' ');
        }
      }
      return this["do"].end();
    };

    Editor.prototype.insertNewline = function() {
      this["do"].start();
      this.deleteSelection();
      if (this.cursorAtEndOfLine()) {
        this["do"].change(this.lines.splice(this.cursor[1] + 1, 0, ""));
      } else {
        this["do"].insert(this.lines, this.cursor[1] + 1, this.lines[this.cursor[1]].substr(this.cursor[0]));
        this["do"].change(this.lines, this.cursor[1], this.lines[this.cursor[1]].substr(0, this.cursor[0]));
      }
      this.moveCursorRight();
      return this["do"].end();
    };

    Editor.prototype.insertText = function(text) {
      var c, j, len;
      this["do"].start();
      this.deleteSelection();
      for (j = 0, len = text.length; j < len; j++) {
        c = text[j];
        if (c === '\n') {
          this.insertNewline();
        } else {
          this.insertCharacter(c);
        }
      }
      return this["do"].end();
    };

    Editor.prototype.joinLine = function() {
      if (!this.cursorInLastLine()) {
        this["do"].start();
        this["do"].change(this.lines, this.cursor[1], this.lines[this.cursor[1]] + this.lines[this.cursor[1] + 1]);
        this["do"]["delete"](this.lines, this.cursor[1] + 1);
        return this["do"].end();
      }
    };

    Editor.prototype.deleteLineAtIndex = function(i) {
      return this["do"]["delete"](this.lines, i);
    };

    Editor.prototype.deleteCharacterRangeInLineAtIndex = function(r, i) {
      return this["do"].change(this.lines, i, this.lines[i].splice(r[0], r[1] - r[0]));
    };

    Editor.prototype.deleteSelection = function() {
      var i, j, lineRange, ref, ref1, selStart;
      if (this.selection == null) {
        return;
      }
      lineRange = this.selectedLineRange();
      if (lineRange == null) {
        return;
      }
      this["do"].start();
      this.deleteCharacterRangeInLineAtIndex(this.selectedCharacterRangeForLineAtIndex(lineRange[1]), lineRange[1]);
      if (lineRange[1] > lineRange[0]) {
        for (i = j = ref = lineRange[1] - 1, ref1 = lineRange[0]; ref <= ref1 ? j < ref1 : j > ref1; i = ref <= ref1 ? ++j : --j) {
          this.deleteLineAtIndex(i);
        }
        this.deleteCharacterRangeInLineAtIndex(this.selectedCharacterRangeForLineAtIndex(lineRange[0]), lineRange[0]);
      }
      selStart = this.selectionStart();
      this.setCursor(selStart[0], selStart[1]);
      if (lineRange[1] > lineRange[0]) {
        this.joinLine();
      }
      return this["do"].end();
    };

    Editor.prototype.deleteForward = function() {
      if (this.selection != null) {
        this.deleteSelection();
        return;
      }
      if (this.cursorAtEndOfLine()) {
        return this.joinLine();
      } else {
        return this["do"].change(this.lines, this.cursor[1], this.lines[this.cursor[1]].splice(this.cursor[0], 1));
      }
    };

    Editor.prototype.deleteBackward = function() {
      var cursorIndex, i, il, j, rc, ref, results, strToCursor;
      if (this.selection != null) {
        return this.deleteSelection();
      } else {
        if (this.cursorInFirstLine() && this.cursorAtStartOfLine()) {
          return;
        }
        cursorIndex = Math.min(this.lines[this.cursor[1]].length - 1, this.cursor[0]);
        strToCursor = this.lines[this.cursor[1]].substr(0, cursorIndex);
        if (strToCursor.trim() === '') {
          il = this.indentString().length;
          rc = cursorIndex % il || il;
          results = [];
          for (i = j = 0, ref = rc; 0 <= ref ? j < ref : j > ref; i = 0 <= ref ? ++j : --j) {
            this.moveCursorLeft();
            results.push(this.deleteForward());
          }
          return results;
        } else {
          this.moveCursorLeft();
          return this.deleteForward();
        }
      }
    };

    Editor.prototype.text = function() {
      return this.lines.join('\n');
    };

    Editor.prototype.selectedText = function() {
      return this.selectedLines().join('\n');
    };

    Editor.prototype.lastPos = function() {
      var lli;
      lli = this.lines.length - 1;
      return [this.lines[lli].length, lli];
    };

    Editor.prototype.posForEvent = function(event) {
      var br, lx, ly, sl, st;
      sl = this.elem.scrollLeft;
      st = this.elem.scrollTop;
      br = this.elem.getBoundingClientRect();
      lx = clamp(0, this.elem.clientWidth, event.clientX - br.left);
      ly = clamp(0, this.elem.clientHeight, event.clientY - br.top);
      return [parseInt(Math.floor((Math.max(0, sl + lx - 10)) / this.charSize[0])), parseInt(Math.floor((Math.max(0, st + ly - 10)) / this.charSize[1]))];
    };

    Editor.prototype.cursorPos = function() {
      var c, l;
      l = clamp(0, this.lines.length - 1, this.cursor[1]);
      c = clamp(0, this.lines[l].length, this.cursor[0]);
      return [c, l];
    };

    Editor.prototype.clampPos = function(p) {
      var c, l;
      l = clamp(0, this.lines.length - 1, p[1]);
      c = clamp(0, this.lines[l].length - 1, p[0]);
      return [c, l];
    };

    Editor.prototype.rangeForWordAtPos = function(pos) {
      var c, l, n, p, r;
      p = this.clampPos(pos);
      l = this.lines[p[1]];
      r = [p[0], p[0]];
      c = l[r[0]];
      while (r[0] > 0) {
        n = l[r[0] - 1];
        if ((c === ' ') && (n !== ' ') || (c !== ' ') && (n === ' ')) {
          break;
        }
        r[0] -= 1;
      }
      while (r[1] < l.length - 1) {
        n = l[r[1] + 1];
        if ((c === ' ') && (n !== ' ') || (c !== ' ') && (n === ' ')) {
          break;
        }
        r[1] += 1;
      }
      return [[r[0], p[1]], [r[1] + 1, p[1]]];
    };

    Editor.prototype.update = function() {
      return this.elem.innerHTML = html.render(this.lines, this.cursor, this.selectionRanges(), this.charSize);
    };

    Editor.prototype.onKeyDown = function(event) {
      var ansiKeycode, combo, key, mod, ref, ref1, ref2;
      ref = keyinfo.forEvent(event), mod = ref.mod, key = ref.key, combo = ref.combo;
      if (!combo) {
        return;
      }
      switch (key) {
        case 'right click':
          return;
        case 'down':
        case 'right':
        case 'up':
        case 'left':
          this.startSelection(event.shiftKey);
          if (event.metaKey) {
            if (key === 'left') {
              this.moveCursorToStartOfLine();
            } else if (key === 'right') {
              this.moveCursorToEndOfLine();
            }
          } else {
            this.moveCursor(key);
          }
          break;
        default:
          switch (combo) {
            case 'enter':
              this.insertNewline();
              break;
            case 'tab':
            case 'command+]':
              return this.insertTab() + event.preventDefault();
            case 'shift+tab':
            case 'command+[':
              return this.deIndent() + event.preventDefault();
            case 'delete':
            case 'ctrl+backspace':
              this.deleteForward();
              break;
            case 'backspace':
              this.deleteBackward();
              break;
            case 'command+j':
              this.joinLine();
              break;
            case 'ctrl+a':
              this.moveCursorToStartOfLine();
              break;
            case 'ctrl+e':
              this.moveCursorToEndOfLine();
              break;
            case 'command+d':
              return this.selectNone();
            case 'command+a':
              return this.selectAll();
            case 'command+c':
              return clipboard.writeText(this.selectedText());
            case 'command+v':
              this.insertText(clipboard.readText());
              break;
            case 'command+x':
              clipboard.writeText(this.selectedText());
              this.deleteSelection();
              break;
            case 'command+z':
              this["do"].undo(this);
              this.update();
              return;
            case 'command+shift+z':
              this["do"].redo(this);
              this.update();
              return;
            case 'ctrl+shift+a':
              this.startSelection(true);
              this.moveCursorToStartOfLine();
              break;
            case 'ctrl+shift+e':
              this.startSelection(true);
              this.moveCursorToEndOfLine();
              break;
            default:
              ansiKeycode = require('ansi-keycode');
              if (((ref1 = ansiKeycode(event)) != null ? ref1.length : void 0) === 1) {
                this.insertCharacter(ansiKeycode(event));
              } else {
                log("ignoring", combo);
              }
          }
      }
      this.endSelection(event.shiftKey);
      return (ref2 = $('cursor')) != null ? ref2.scrollIntoViewIfNeeded() : void 0;
    };

    return Editor;

  })();

  module.exports = Editor;

}).call(this);
