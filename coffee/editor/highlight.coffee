# 000   000  000   0000000   000   000  000      000   0000000   000   000  000000000
# 000   000  000  000        000   000  000      000  000        000   000     000   
# 000000000  000  000  0000  000000000  000      000  000  0000  000000000     000   
# 000   000  000  000   000  000   000  000      000  000   000  000   000     000   
# 000   000  000   0000000   000   000  0000000  000   0000000   000   000     000   

matchr = require '../tools/matchr'
encode = require '../tools/encode'
enspce = require '../tools/enspce'
log    = require '../tools/log'
noon   = require 'noon'
_      = require 'lodash'

class highlight
    
    @matchrConfig = null

    @init: =>
        patterns = noon.load "#{__dirname}/../../syntax/coffee.noon"
        @matchrConfig = matchr.config patterns

    #  0000000   0000000   000       0000000   00000000   000  0000000  00000000
    # 000       000   000  000      000   000  000   000  000     000   000     
    # 000       000   000  000      000   000  0000000    000    000    0000000 
    # 000       000   000  000      000   000  000   000  000   000     000     
    #  0000000   0000000   0000000   0000000   000   000  000  0000000  00000000
    
    @colorize: (str, stack) =>
        try
            smp = stack.map (s) -> String(s).split '.'
            chk = {}
            spl = []
            for s in smp
                if not chk[s[0]]?
                    chk[s[0]] = s.slice 1
                    spl.push s
            spl = _.flatten spl
            str = "<span class=\"#{spl.join ' '}\">#{encode str}</span>"
                    
        catch err
            error err
        str

    # 000      000  000   000  00000000
    # 000      000  0000  000  000     
    # 000      000  000 0 000  0000000 
    # 000      000  000  0000  000     
    # 0000000  000  000   000  00000000
    
    @line: (line) =>
                
        rngs = matchr.ranges @matchrConfig, line
        # log "rngs", rngs
        diss = matchr.dissect rngs 
        if diss.length
            for di in [diss.length-1..0]
                d = diss[di]
                clrzd = @colorize d.match, d.stack.reverse()
                line = line.slice(0, d.start) + clrzd + line.slice(d.start+d.match.length)

        enspce line
                
highlight.init()

module.exports = highlight
