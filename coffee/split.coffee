#  0000000  00000000   000      000  000000000
# 000       000   000  000      000     000   
# 0000000   00000000   000      000     000   
#      000  000        000      000     000   
# 0000000   000        0000000  000     000   

{
$,sw,sh
}     = require './tools/tools'
log   = require './tools/log'
pos   = require './tools/pos'
drag  = require './tools/drag'
prefs = require './tools/prefs'
 
class Split

    @commandlineHeight = 30
    @titlebarHeight    = 23
    @handleHeight      = 6
    
    # 000  000   000  000  000000000
    # 000  0000  000  000     000   
    # 000  000 0 000  000     000   
    # 000  000  0000  000     000   
    # 000  000   000  000     000   
    
    @init: (wid) ->
        
        @winID       = wid
        @elem        = $('.split')
        @topHandle   = $('.split-handle.top')
        @botHandle   = $('.split-handle.bot')
        @topView     = $('.split-top')
        @botView     = $('.split-bot')
        @commandLine = $('.commandline')
        @editor      = $('.editor')                
        
        @dragBot = new drag
            target: @botHandle
            cursor: 'ns-resize'
            onMove: (drag) => @splitAt drag.cpos.y
            onStop: (drag) => @snap()

        @dragTop = new drag
            target: @topHandle
            cursor: 'ns-resize'
            onMove: (drag) => @splitAt drag.cpos.y + 40
            onStop: (drag) => @snap()
    
        @splitAt @getState 'split', @titlebarHeight
    
    # 00000000   00000000   0000000  000  0000000  00000000  0000000  
    # 000   000  000       000       000     000   000       000   000
    # 0000000    0000000   0000000   000    000    0000000   000   000
    # 000   000  000            000  000   000     000       000   000
    # 000   000  00000000  0000000   000  0000000  00000000  0000000  
    
    @resized: ->
        return if not @dragTop
        @dragTop.setMinMax pos(0, @titlebarHeight), pos(0, sh()-@commandlineHeight-2*@handleHeight)
        @dragBot.setMinMax pos(0, @titlebarHeight), pos(0, sh()-@handleHeight)        
        if @dragBot.target.getBoundingClientRect().bottom > sh()
            @splitAt sh()-@handleHeight
    
    #  0000000  00000000   000      000  000000000
    # 000       000   000  000      000     000   
    # 0000000   00000000   000      000     000   
    #      000  000        000      000     000   
    # 0000000   000        0000000  000     000   
    
    @splitAt: (y) ->
        @topView    .style.height = "#{y-@commandlineHeight-@titlebarHeight-@handleHeight}px"
        @topView    .style.top = "#{@titlebarHeight}px"
        @topHandle  .style.top = "#{y-@commandlineHeight-@handleHeight}px"
        @commandLine.style.top = "#{y-@commandlineHeight}px"
        @botHandle  .style.top = "#{y-2}px"
        @botView    .style.top = "#{y+@handleHeight-2}px"
        @dragTop.setMinMax pos(0, @titlebarHeight), pos(0, sh()-@commandlineHeight-2*@handleHeight)
        @dragBot.setMinMax pos(0, @titlebarHeight), pos(0, sh()-@handleHeight)
        @setState 'split', y

    #  0000000   0000000   00     00  00     00   0000000   000   000  0000000    000      000  000   000  00000000
    # 000       000   000  000   000  000   000  000   000  0000  000  000   000  000      000  0000  000  000     
    # 000       000   000  000000000  000000000  000000000  000 0 000  000   000  000      000  000 0 000  0000000 
    # 000       000   000  000 0 000  000 0 000  000   000  000  0000  000   000  000      000  000  0000  000     
    #  0000000   0000000   000   000  000   000  000   000  000   000  0000000    0000000  000  000   000  00000000
    
    @showCommandline: ->
        if @dragTop.target.getBoundingClientRect().top < 0
            @splitAt @titlebarHeight+@commandlineHeight+@handleHeight

    @hideCommandline: ->
        if @dragBot.target.getBoundingClientRect().top > @titlebarHeight
            @splitAt @titlebarHeight+2
     
    #  0000000  000   000   0000000   00000000 
    # 000       0000  000  000   000  000   000
    # 0000000   000 0 000  000000000  00000000 
    #      000  000  0000  000   000  000      
    # 0000000   000   000  000   000  000      
    
    @snap: ->
        t = @dragBot.target.getBoundingClientRect().top
        if t > @titlebarHeight
            if t < @titlebarHeight+(@commandlineHeight+@handleHeight)/2
                @splitAt @titlebarHeight+2
            else if t <  @titlebarHeight+(@commandlineHeight+@handleHeight)*2
                @splitAt @titlebarHeight+@commandlineHeight+@handleHeight

    # 00000000   0000000    0000000  000   000   0000000
    # 000       000   000  000       000   000  000     
    # 000000    000   000  000       000   000  0000000 
    # 000       000   000  000       000   000       000
    # 000        0000000    0000000   0000000   0000000 
    
    @focusOnEditorOrHistory: ->
        @focusOnEditor()
        
    @focusOnEditor: ->
        @hideCommandline()
        @focusEditor()
        
    @focusEditor: ->
        @editor.focus()

    #  0000000  000000000   0000000   000000000  00000000
    # 000          000     000   000     000     000     
    # 0000000      000     000000000     000     0000000 
    #      000     000     000   000     000     000     
    # 0000000      000     000   000     000     00000000
            
    @setState: (key, value) ->
        if @winID
            prefs.setPath "windows.#{@winID}.#{key}", value
        
    @getState: (key, value) ->
        if @winID
            prefs.getPath "windows.#{@winID}.#{key}", value

module.exports = Split