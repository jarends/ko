#00000000  0000000    000  000000000   0000000   00000000 
#000       000   000  000     000     000   000  000   000
#0000000   000   000  000     000     000   000  0000000  
#000       000   000  000     000     000   000  000   000
#00000000  0000000    000     000      0000000   000   000

tools  = require './tools/tools'
log    = require './tools/log'
encode = require('html-entities').XmlEntities.encode
$ = (id) -> document.getElementById id

class Editor
    @charSize   = [0,0]
    @cursor     = [0,0]
    @selection  = null
    @lines      = [""]
    @cursorSpan = ""
    @id         = ""

    #  0000000  00000000  000      00000000   0000000  000000000  000   0000000   000   000
    # 000       000       000      000       000          000     000  000   000  0000  000
    # 0000000   0000000   000      0000000   000          000     000  000   000  000 0 000
    #      000  000       000      000       000          000     000  000   000  000  0000
    # 0000000   00000000  0000000  00000000   0000000     000     000   0000000   000   000

    @selectionStart: =>
        if @selection? 
            return [@selection[0], @selection[1]] if @selection[1] < @cursor[1]
            return [Math.min(@cursor[0], @lines[@cursor[1]].length), @cursor[1]] if @selection[1] > @cursor[1]
            return [Math.min(@selection[0], @cursor[0]), @cursor[1]]
        return [Math.min(@cursor[0], @lines[@cursor[1]].length), @cursor[1]]

    @selectRange: (range) =>
        @selection = range[0]
        @cursor    = range[1]

    @startSelection: (active) =>
        if active and not @selection?
            @selection = [Math.min(@cursor[0], @lines[@cursor[1]].length),@cursor[1]]
            # log "start", @selection

    @endSelection: (active) =>
        if @selection? and not active
            @selection = null
            # log "end"
            
    @selectedLineRange: =>
        if @selection
            [Math.min(@cursor[1], @selection[1]), Math.max(@cursor[1], @selection[1])]
            
    @selectedCharacterRangeForLineAtIndex: (i) =>
        return if not @selection
        lines = @selectedLineRange()
        return if i < lines[0] or i > lines[1]
        return [0, @lines[i].length] if lines[0] < i < lines[1]
        if lines[0] == lines[1]
            return [Math.min(@cursor[0], @selection[0]), Math.max(@cursor[0], @selection[0])]
        if i == @cursor[1]
            if @selection[1] > i
                return [@cursor[0], @lines[i].length]
            else
                return [0, Math.min(@lines[i].length, @cursor[0])]
        else
            if @cursor[1] > i
                return [@selection[0], @lines[i].length]
            else
                return [0, Math.min(@lines[i].length, @selection[0])]

    #  0000000  000   000  00000000    0000000   0000000   00000000 
    # 000       000   000  000   000  000       000   000  000   000
    # 000       000   000  0000000    0000000   000   000  0000000  
    # 000       000   000  000   000       000  000   000  000   000
    #  0000000   0000000   000   000  0000000    0000000   000   000

    @cursorAtEndOfLine:   => @cursor[0] == @lines[@cursor[1]].length
    @cursorAtStartOfLine: => @cursor[0] == 0
    @cursorInLastLine:    => @cursor[1] == @lines.length-1
    @cursorInFirstLine:   => @cursor[1] == 0

    # 00     00   0000000   000   000  00000000
    # 000   000  000   000  000   000  000     
    # 000000000  000   000   000 000   0000000 
    # 000 0 000  000   000     000     000     
    # 000   000   0000000       0      00000000
    
    @moveCursorToEndOfLine: =>
        @cursor[0] = @lines[@cursor[1]].length
        
    @moveCursorToStartOfLine: =>
        @cursor[0] = 0

    @moveCursorToLineChar: (l,c=0) =>
        @cursor[1] = Math.min l, @lines.length-1
        @cursor[0] = Math.min c, @lines[@cursor[1]].length
        
    @moveCursorToPos: (pos) =>
        @cursor[1] = Math.min pos[1], @lines.length-1
        @cursor[0] = Math.min pos[0], @lines[@cursor[1]].length        

    @moveCursorUp: =>
        if @cursorInFirstLine()
            @moveCursorToStartOfLine()
        else
            @cursor[1] -= 1

    @moveCursorDown: =>
        if @cursorInLastLine()
            @moveCursorToEndOfLine()
        else
            @cursor[1] += 1

    @moveCursorRight: =>
        if @cursorAtEndOfLine() 
            if not @cursorInLastLine()
                @moveCursorDown()
                @moveCursorToStartOfLine()
        else
            @cursor[0] += 1
    
    @moveCursorLeft: =>
        @cursor[0] = Math.min @lines[@cursor[1]].length, @cursor[0]
        if @cursorAtStartOfLine()
            if not @cursorInFirstLine()
                @moveCursorUp()
                @moveCursorToEndOfLine()
        else
            @cursor[0] -= 1
    
    @moveCursor: (direction) =>
        switch direction
            when 'left'  then @moveCursorLeft()
            when 'right' then @moveCursorRight()
            when 'up'    then @moveCursorUp()
            when 'down'  then @moveCursorDown()
            
    # 000  000   000   0000000  00000000  00000000   000000000
    # 000  0000  000  000       000       000   000     000   
    # 000  000 0 000  0000000   0000000   0000000       000   
    # 000  000  0000       000  000       000   000     000   
    # 000  000   000  0000000   00000000  000   000     000   
    
    @insertCharacter: (c) =>
        @deleteSelection() if @selection?
        @lines[@cursor[1]] = @lines[@cursor[1]].splice @cursor[0], 0, c
        @cursor[0] += 1

    @insertNewline: =>
        @deleteSelection() if @selection?
        if @cursorAtEndOfLine()
            @lines.splice @cursor[1]+1, 0, ""
        else
            @lines.splice @cursor[1]+1, 0, @lines[@cursor[1]].substr @cursor[0]
            @lines[@cursor[1]] = @lines[@cursor[1]].substr 0, @cursor[0]
        @moveCursorRight()
        
    @insertText: (text) =>
        @deleteSelection() if @selection?
        for c in text
            if c == '\n'
                @insertNewline()
            else
                @insertCharacter c
    
    # 0000000    00000000  000      00000000  000000000  00000000
    # 000   000  000       000      000          000     000     
    # 000   000  0000000   000      0000000      000     0000000 
    # 000   000  000       000      000          000     000     
    # 0000000    00000000  0000000  00000000     000     00000000
    
    @joinLine: =>
        if not @cursorInLastLine()
            @lines[@cursor[1]] += @lines[@cursor[1]+1]
            @lines.splice @cursor[1]+1, 1
            
    @deleteLineAtIndex: (i) =>
        @lines.splice i, 1
        
    @deleteCharacterRangeInLineAtIndex: (r, i) =>
        @lines[i] = @lines[i].splice r[0], r[1]-r[0]
            
    @deleteSelection: =>
        lineRange = @selectedLineRange()
        return if not lineRange?
        @deleteCharacterRangeInLineAtIndex @selectedCharacterRangeForLineAtIndex(lineRange[1]), lineRange[1]
        if lineRange[1] > lineRange[0]
            for i in [(lineRange[1]-1)...lineRange[0]]
                @deleteLineAtIndex i
            @deleteCharacterRangeInLineAtIndex @selectedCharacterRangeForLineAtIndex(lineRange[0]), lineRange[0]
        @cursor = @selectionStart()
        if lineRange[1] > lineRange[0]
            @joinLine()

    @deleteForward: =>
        if @selection?
            @deleteSelection()
            return
        if @cursorAtEndOfLine()
            @joinLine()
        else
            @lines[@cursor[1]] = @lines[@cursor[1]].splice @cursor[0], 1
    
    @deleteBackward: =>
        if @selection?
            @deleteSelection()
            return
        return if @cursorInFirstLine() and @cursorAtStartOfLine()
        @moveCursorLeft()
        @deleteForward()
            
    # 000   000  000000000  00     00  000    
    # 000   000     000     000   000  000    
    # 000000000     000     000000000  000    
    # 000   000     000     000 0 000  000    
    # 000   000     000     000   000  0000000
                
    @html: =>
        enc = (l) ->
            r = encode l
            r = r.replace /\s/g, '&nbsp;'
            r

        h = []
        for i in [0...@lines.length]
            l = @lines[i]
            selStart = "<span class=\"selection\">"
            selEnd = "</span>"
            range = @selectedCharacterRangeForLineAtIndex i
            if range
                log "selection range at line", i, ":", range[0], range[1]
                left  = l.substr  0, range[0]
                mid   = l.substr  range[0], range[1]-range[0] 
                right = l.substr  range[1]
                if i == @cursor[1]
                    if @cursor[0] == range[0]
                        h.push enc(left) + @cursorSpan + selStart + enc(mid) + selEnd + enc(right)
                    else
                        h.push enc(left) + selStart + enc(mid) + selEnd + @cursorSpan + enc(right)
                else
                    h.push enc(left) + selStart + enc(mid) + selEnd + enc(right)
            else if i == @cursor[1]
                left  = l.substr  0, @cursor[0]
                right = l.substr  @cursor[0]
                h.push enc(left) + @cursorSpan + enc(right)
            else
                h.push enc(l)
        h.join '<br>'

    # 00000000    0000000    0000000
    # 000   000  000   000  000     
    # 00000000   000   000  0000000 
    # 000        000   000       000
    # 000         0000000   0000000 
    
    @posForEvent: (event) =>
        sl = $(@id).scrollLeft
        st = $(@id).scrollTop
        log 'scroll', sl, st
        [parseInt(Math.floor((Math.max(0, sl + event.offsetX-10))/@charSize[0])),
         parseInt(Math.floor((Math.max(0, st + event.offsetY-10))/@charSize[1]))]

    # 00000000    0000000   000   000   0000000   00000000   0000000
    # 000   000  000   000  0000  000  000        000       000     
    # 0000000    000000000  000 0 000  000  0000  0000000   0000000 
    # 000   000  000   000  000  0000  000   000  000            000
    # 000   000  000   000  000   000   0000000   00000000  0000000 
    
    @rangeForWordAtPos: (pos) =>
        l = @lines[pos[1]]
        r = [pos[0], pos[0]]
        c = l[r[0]]
        while r[0] > 0
            n = l[r[0]-1]
            if (c == ' ') and (n != ' ') or (c != ' ') and (n == ' ')
                break
            r[0] -= 1
        while r[1] < l.length-1
            n = l[r[1]+1]
            if (c == ' ') and (n != ' ') or (c != ' ') and (n == ' ')
                break
            r[1] += 1
        [[r[0], pos[1]], [r[1]+1, pos[1]]]

    # 000   000  00000000   0000000     0000000   000000000  00000000
    # 000   000  000   000  000   000  000   000     000     000     
    # 000   000  00000000   000   000  000000000     000     0000000 
    # 000   000  000        000   000  000   000     000     000     
    #  0000000   000        0000000    000   000     000     00000000

    @update: =>
        $(@id).innerHTML = @html()

    # 000  000   000  000  000000000
    # 000  0000  000  000     000   
    # 000  000 0 000  000     000   
    # 000  000  0000  000     000   
    # 000  000   000  000     000   

    @init: (className) =>
        @id = className
        o = document.createElement 'div'
        o.className = className
        o.innerHTML = 'XXXXXXXXXX'
        o.style = 
          float:      'left'
          visibility: 'hidden'
        document.body.appendChild o
        @charSize = [o.clientWidth/o.innerHTML.length, o.clientHeight]
        o.remove()
        @cursorSpan = "<span id=\"cursor\" style=\"height: #{@charSize[1]}px\"></span>"
        $(className).innerHTML = @cursorSpan

module.exports = Editor