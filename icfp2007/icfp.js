function assert(f) {
    if (f) {
        return;
    }
    var stackTrace = "";
    for (var curFunc = arguments.callee.caller; curFunc; curFunc = curFunc.caller) {
        stackTrace += curFunc.toString() + "\n";
    }
    throw "assertion failed: " + stackTrace;
}

function distance(begin, end) {
    var ans = 0;
    for (var it = begin.clone(); it.block <= end.block && !it.end(); ++it.block) {
        ans += it.curblock().length();
        
        if (it.block === begin.block) {
            ans -= begin.i;
        }
        
        if (it.block === end.block) {
            ans -= end.curblock().length() - end.i;
        }
    }
    return ans;
}

function protect(l, d) {
    if (l === 0) {
        return d;
    } else {
        return protect(l - 1, quote(d));
    }
}

function quote(d) {
    var ans = "";
    for (var i = 0; i < d.length; ++i) {
        var c = d.charAt(i);
        if (c === "I") {
            ans += "C";
        } else if (c === "C") {
            ans += "F";
        } else if (c === "F") {
            ans += "P"
        } else {
            ans += "IC";
        }
    }
    return ans;
}

function asnat(n) {
    if (n === 0) {
        return "P";
    } else if (n % 2 === 0) {
        return "I" + asnat(Math.floor(n / 2));
    } else {
        return "C" + asnat(Math.floor(n / 2));
    }
}

function Block(fragment, begin, end) {
    this.fragment = fragment;
    this.begin = begin;
    this.end = end;
}
    
Block.prototype.charAt = function(i) {
    return this.fragment.charAt(this.begin + i);
}
    
Block.prototype.length = function() {
    return this.end - this.begin;
}
    
Block.prototype.clone = function() {
    return new Block(this.fragment, this.begin, this.end);
}
    
Block.prototype.toString = function() {
    return this.fragment.substring(this.begin, this.end);
}
    
Block.prototype.indexOf = function(s, i) {
    var x = this.fragment.indexOf(s, this.begin + i);
    if (x !== -1 && x <= this.length() - s.length) {
        return x - this.begin;
    }
    return -1;
}

function Iterator(dna, block, i) {
    this.dna = dna;
    this.block = block;
    this.i = i;
}

Iterator.prototype.charAt = function () {
        //assert(!this.end());
        return this.curblock().charAt(this.i);
    }
    
Iterator.prototype.advance = function(i) {
    this.i += i;
    while (this.i >= this.curblock().length()) {
        this.i -= this.curblock().length();
        ++this.block;
        if (this.end()) {
            this.i = 0;
            break;
        }
    }
    return this;
}
    
Iterator.prototype.clone = function() {
    return new Iterator(this.dna, this.block, this.i);
}
    
Iterator.prototype.end = function() {
    return this.block >= this.dna.blocks.length;
}
    
Iterator.prototype.equal = function(other) {
    return this.block === other.block &&
        this.i === other.i;
}
    
Iterator.prototype.curblock = function() {
    return this.dna.blocks[this.block];
}
    
Iterator.prototype.prefixIs = function(s) {
    if (this.charAt() !== s.charAt(0)) {
        return false;
    }

    var it = this.clone().advance(1);
    for (var i = 1; i < s.length; ++i) {
        if (it.end() || s.charAt(i) !== it.charAt()) {
            return false;
        }
        it.advance(1);
    }
    return true;
}
    
Iterator.prototype.advanceTo = function(s) {
    while (!this.end()) {
        if (this.prefixIs(s)) {
            return;
        }
        this.advance(1);
    }
}
/*
        while (!this.end()) {
            var x = this.curblock().indexOf(s, this.i);
            if (x !== -1) {
                this.i = x;
                return;
            }
            this.i = Math.max(this.i, this.curblock().length() - s.length);
            while (this.i !== 0) {
                if (this.prefixIs(s)) {
                    return;
                }
                this.advance(1);
            }
        }
*/

function Dna(dna){
    this.head = new Iterator(this, 0, 0);
    this.blocks = [];
    this.canAppend = false;
    this.append(dna);
}
    
Dna.prototype.advance = function(i) {
    this.head.advance(i);
}
    
Dna.prototype.prefixIs = function(s) {
    return this.head.prefixIs(s);
}
    
Dna.prototype.pattern = function() {
    var ans = [];
    var lvl = 0;
    
    while (true)
    {
        if (this.head.end()) {
            throw "finished";
        }
        switch(this.head.charAt())
        {
        case "C":
            this.head.advance(1);
            ans.push("I");
            break;
        case "F":
            this.head.advance(1);
            ans.push("C");                
            break;
        case "P":
            this.head.advance(1);
            ans.push("F");
            break;
        case "I":
            var it = this.head.clone().advance(1);
            if (it.end()) {
                throw "finished";
            }
            switch(it.charAt())
            {
                case "C":
                    this.head.advance(2);
                    ans.push("P");
                    break;
                case "P":
                    this.head.advance(2);
                    ans.push({name: "!", value: this.nat()});
                    break;
                case "F":
                    this.head.advance(3);
                    ans.push({name: "?", value: this.consts()});
                    break;
                case "I":
                    it.advance(1);
                    if (it.end()) {
                        throw "finished";
                    }

                    switch(it.charAt())
                    {
                        case "P":
                            this.head.advance(3);
                            ++lvl; 
                            ans.push("(");
                            break;
                        case "C":
                        case "F":
                            this.head.advance(3);
                            if (lvl === 0) {
                                return ans;
                            } else {
                                --lvl; ans.push(")");
                            }
                            break;
                        case "I":
                            this.emitRna();
                            break;
                    }
                    break;
            }
            break;
        }
    }
}    
/*    
    this.pattern = function() {
        var ans = [];
        var lvl = 0;
        
        while (true)
        {
            if (this.prefixIs("C")) {
                this.advance(1);
                ans.push("I");
            } else if (this.prefixIs("F")) {
                this.advance(1);
                ans.push("C");                
            } else if (this.prefixIs("P")) {
                this.advance(1);
                ans.push("F");
            } else if (this.prefixIs("IC")) {
                this.advance(2);
                ans.push("P");
            } else if (this.prefixIs("IP")) {
                this.advance(2);
                ans.push({name: "!", value: this.nat()});
            } else if (this.prefixIs("IF")) {
                this.advance(3);
                ans.push({name: "?", value: this.consts()});
            } else if (this.prefixIs("IIP")) {
                this.advance(3);
                ++lvl; 
                ans.push("(");
            } else if (this.prefixIs("IIC") || this.prefixIs("IIF")) {
                this.advance(3);
                if (lvl === 0) {
                    return ans;
                } else {
                    --lvl; ans.push(")");
                }
            } else if (this.prefixIs("III")) {
                this.emitRna();
            } else {
                throw "finished";
            }
        }
        return null;
    }
*/    
Dna.prototype.nat = function() {
    var c = this.head.charAt();
    this.advance(1);
    if (c === "P") {
        return 0;
    } else if (c === "I" || c === "F"){
        return 2 * this.nat();
    } else if (c ===  "C") {
        return 2 * this.nat() + 1;
    } else {
        throw "finish";
    }
}
    
Dna.prototype.consts = function() {
    if (this.prefixIs("C")) {
        this.advance(1);
        return "I" + this.consts();
    } else if (this.prefixIs("F")) {
        this.advance(1);
        return "C" + this.consts();
    } else if (this.prefixIs("P")) {
        this.advance(1);
        return "F" + this.consts();
    } else if (this.prefixIs("IC")) {
        this.advance(2);
        return "P" + this.consts();
    } else {
        return "";
    }
}
    
Dna.prototype.template = function() {
    var ans = [];
    while (true) {
        if (this.prefixIs("C")) {
            this.advance(1);
            ans.push("I");
        } else if (this.prefixIs("F")) {
            this.advance(1);
            ans.push("C");
        } else if (this.prefixIs("P")) {
            this.advance(1);
            ans.push("F");
        } else if (this.prefixIs("IC")) {
            this.advance(2);
            ans.push("P");
        } else if (this.prefixIs("IF") || this.prefixIs("IP")) {
            this.advance(2);
            var l = this.nat();
            var n = this.nat();
            ans.push({"name": n, "value": l});
        } else if (this.prefixIs("IIC") || this.prefixIs("IIF")) {
            this.advance(3);
            return ans;
        } else if (this.prefixIs("IIP")) {
            this.advance(3);
            ans.push({"name": "|", "value": this.nat()});
        } else if (this.prefixIs("III")) {
            this.emitRna();
        } else {
            throw "finish";
        }
    }
}
    
Dna.prototype.matchreplace = function(pat, t) {
    var it = this.head.clone();
    var e = [];
    var c = [];
    
    for (var i = 0; i < pat.length; ++i) {
        if (pat[i] === "(") {
            c.push(it.clone());
        } else if (pat[i] === ")") {
            e.push({"begin": c.pop(), "end": it.clone()});
        } else if (typeof(pat[i]) === "string") {
            if (it.charAt() === pat[i]) {
                it.advance(1);
            } else {
                return this;
            }
        } else if (pat[i].name === "!") {
            it.advance(pat[i].value);
            if (it.end()) {
                return this;
            }
        } else {
            it.advanceTo(pat[i].value);
            if (it.end())
            {
                return this;
            }
            
        /*
            while(!it.prefixIs(pat[i].value)) {
                it.advance(1);
                if (it.end()) {
                    return this;
                }
            }
        */
            it.advance(pat[i].value.length);
        }
    }
    this.head = it;
    return this.replace(t, e);
}
    
Dna.prototype.emitRna = function() {
    this.advance(3);
    var begin = this.head.clone();
    this.advance(7);
    ui.emitRna(this.substr(begin, this.head));
}
    
Dna.prototype.substr = function(begin, end) {
    var ans = "";
    for (var it = begin.clone(); !it.equal(end); it.advance(1)) {
        ans += it.charAt();
    }
    return ans;
}
    
Dna.prototype.replace = function(t, e) {
    var r = new Dna("");
    for (var i = 0; i < t.length; ++i) {
        if (typeof(t[i]) === "string") {
            r.append(t[i]);
        } else if (t[i].name === "|") {
            var n = t[i].value;
            r.append(asnat((n < e.length) ? distance(e[n].begin, e[n].end) : 0));
        } else {
            var n = t[i].name;
            var l = t[i].value;
            if (n < e.length) {
                if (l === 0) {
                    r.appendReference(e[n].begin, e[n].end);
                } else {
                    r.append(protect(l, this.substr(e[n].begin, e[n].end)));
                }
            }
        }
    }
    r.appendReference(this.head, this.end());
    r = r.defrag();
    return r;
}
    
Dna.prototype.defrag = function() {
    if (this.blocks.length < 128) {
        return this;
    }
    
    var ans ="";
    for (var i = 0; i < this.blocks.length; ++i) {
        ans += this.blocks[i].toString();
    }
    return new Dna(ans);
}
    
Dna.prototype.append = function(s) {
    if (s === "") {
        return;
    }
    if (!this.canAppend) {
        this.blocks.push(new Block("", 0, 0));
    }
    this.canAppend = true;
    this.lastBlock().fragment += s;
    this.lastBlock().end += s.length;
}
    
Dna.prototype.appendReference = function(begin, end) {
    for (var it = begin.clone(); it.block <= end.block && !it.end(); ++it.block)
    {
        this.blocks.push(it.curblock().clone());
        
        if (it.block === begin.block) {
            this.lastBlock().begin += begin.i;
        }
        
        if (it.block === end.block) {
            this.lastBlock().end -= end.curblock().length() - end.i;
        }
        
        if (this.lastBlock().length() === 0) {
            this.blocks.pop();
        }
    }
    this.canAppend = false;
}
    
Dna.prototype.lastBlock = function() {
    return this.blocks[this.blocks.length - 1];
}
    
Dna.prototype.end = function() {
    return new Iterator(this, this.blocks.length - 1, this.lastBlock().length());
}
    
Dna.prototype.debugStr = function() {
    var total = 0;
    for (var i = 0; i < this.blocks.length; ++i) {
        total += this.blocks[i].length();
    }
    var ans = "" + this.blocks.length + "/" + total;
/*
    for (var i = 0; i < this.blocks.length; ++i) {
        if (i !== 0) {
            ans += ",";
        }
        ans += "(" + this.blocks[i].fragment.length + "," +  this.blocks[i].begin + "," + this.blocks[i].length() + ")";
    }
*/
    return ans;
}


function makeColor(r, g, b, a) {
    return Math.floor(a) * 0x1000000 +
           Math.floor(r) * 0x10000 +
           Math.floor(g) * 0x100 +
           Math.floor(b) * 0x1;
}


function splitColor(c) {
    var ans = {};
    ans.a = Math.floor(c / 0x1000000) % 256;
    ans.r = Math.floor(c / 0x10000) % 256;
    ans.g = Math.floor(c / 0x100) % 256;
    ans.b = Math.floor(c / 0x1) % 256;
    return ans;
}


function Bitmap() {
    this.data = [];
    
    this.get = function(x, y) {
        var p = this.data[x + y * 600];
        if (typeof(p) === "undefined") {
            return 0;
        }
        return p;
    }
    
    this.set = function(x, y, p) {
        this.data[x + y * 600] = p;
    }

    this.line = function(x0, y0, x1, y1, color) {
        var dx = x1 - x0;
        var dy = y1 - y0;
        var d = Math.max(Math.abs(dx), Math.abs(dy));
        var c = (dx * dy <= 0) ? 1 : 0;
        var x = x0 * d + Math.floor((d - c) / 2);
        var y = y0 * d + Math.floor((d - c) / 2);
        for (var i = 0; i < d; ++i) {
            this.set(Math.floor(x / d), Math.floor(y / d), color);
            x += dx;
            y += dy;
        }
        this.set(x1, y1, color);
    }
    
    this.tryfill = function(pos, newColor) {
        var oldColor = this.get(pos.x, pos.y); 
        if (oldColor !== newColor) {
            this.fill(pos, oldColor, newColor);
        }
    }
    
    this.fill = function(start, oldColor, newColor) {
        var stack = [start];
        while (stack.length > 0) {
            var pos = stack.pop();
            var x = pos.x;
            var y = pos.y;
            if (this.get(x, y) === oldColor) {
                this.set(x, y, newColor);
                if (x > 0) { stack.push({"x": x - 1, "y": y}); }
                if (x < 599) { stack.push({"x": x + 1, "y": y}); }
                if (y > 0) { stack.push({"x": x, "y": y - 1}); }
                if (y < 599) { stack.push({"x": x, "y": y + 1}); }
            }
        }
    }
    
    this.combine = function(other, f) {
        for (var x = 0; x < 600; ++x) {
            for (var y = 0; y < 600; ++y) {
                this.set(x, y, f(
                    splitColor(other.get(x, y)), 
                    splitColor(this.get(x,y))));
            }
        }
    }
    
    this.draw = function(canvasContext) {
        var imgData = canvasContext.createImageData(600, 600);
        var i = 0;
        for (var y = 0; y < 600; ++y) {
            for (var x = 0; x < 600; ++x) {
                var c = this.get(x, y);
                imgData.data[i++] = Math.floor(c / 0x10000) % 256;
                imgData.data[i++] = Math.floor(c / 0x100) % 256;
                imgData.data[i++] = Math.floor(c) % 256;
                imgData.data[i++] = 255;
            }
        }
        canvasContext.putImageData(imgData, 0, 0);
    }
}


function RnaBuilder() {
    this.emptyBucket = function () {
        return {"r": 0, "g": 0, "b": 0, "a": 0, "n": 0, "nalpha": 0};
    }
    
    this.bucket = this.emptyBucket();
    this.position = {"x": 0, "y": 0};
    this.mark = {"x": 0, "y": 0};
    this.dir = "E";
    this.bitmaps = [new Bitmap()];
    
    this.build = function(rna) {
        if (rna === "PIPIIIC") {
            this.addColor(0, 0, 0);
        } else if (rna === "PIPIIIP") {
            this.addColor(255, 0, 0);
        } else if (rna === "PIPIICC") {
            this.addColor(0, 255, 0);
        } else if (rna === "PIPIICF") {
            this.addColor(255, 255, 0);
        } else if (rna === "PIPIICP") { 
            this.addColor(0, 0, 255);
        } else if (rna === "PIPIIFC") {
            this.addColor(255, 0, 255);
        } else if (rna === "PIPIIFF") {
            this.addColor(0, 255, 255);
        } else if (rna === "PIPIIPC") {
            this.addColor(255, 255, 255);
        } else if (rna === "PIPIIPF") {
            this.addAlpha(0);
        } else if (rna === "PIPIIPP") {
            this.addAlpha(255);
        } else if (rna === "PIIPICP") {
            this.bucket = this.emptyBucket();
        } else if (rna === "PIIIIIP") {
            this.move();
        } else if (rna === "PCCCCCP") {
            this.turnCounterClockwise();
        } else if (rna === "PFFFFFP") {
            this.turnClockwise();
        } else if (rna === "PCCIFFP") {
            this.mark = {"x": this.position.x, "y": this.position.y};
        } else if (rna === "PFFICCP") {
            //ui.debug("line " + this.position.x + " " + this.position.y + " " + this.mark.x + " " + this.mark.y + " " + this.currentPixel().toString(16));
            this.topBitmap().line(this.position.x, this.position.y, this.mark.x, this.mark.y, this.currentPixel());
        } else if (rna === "PIIPIIP") {
            ui.debug("fill");
            this.topBitmap().tryfill(this.position, this.currentPixel());
        } else if (rna === "PCCPFFP" && this.bitmaps.length < 10) {
            ui.debug("new bitmap");
            this.bitmaps.push(new Bitmap());
        } else if (rna === "PFFPCCP") {
            ui.debug("compose");
            this.combine(this.composeFunc);
        } else if (rna === "PFFICCF") {
            ui.debug("clip");
            this.combine(this.clipFunc);
        }
    }
    
    this.addColor = function(r, g, b) {
        ++this.bucket.n;
        this.bucket.r += r;
        this.bucket.g += g;
        this.bucket.b += b;
    }
    
    this.addAlpha = function(a) {
        ++this.bucket.nalpha;
        this.bucket.a += a;
    }
    
    this.currentPixel = function(a) {
        var r = this.average(this.bucket.r, this.bucket.n, 0);
        var g = this.average(this.bucket.g, this.bucket.n, 0);
        var b = this.average(this.bucket.b, this.bucket.n, 0);
        var a = this.average(this.bucket.a, this.bucket.nalpha, 255);
        return makeColor(r * a / 255, g * a / 255, b * a / 255, a);
    }
    
    this.average = function(x, n, d) {
        return (n === 0) ? d : Math.floor(x / n);
    }
    
    this.move = function() {
        var dx = 0;
        var dy = 0;
        if (this.dir === "N") {
            dy = -1;
        } else if (this.dir === "E") {
            dx = 1;
        } else if (this.dir === "S") {
            dy = 1;
        } else {
            dx = -1;
        }
        this.position.x = (this.position.x + dx) % 600;
        this.position.y = (this.position.y + dy) % 600;
    }
    
    this.turnCounterClockwise = function() {
        this.dir = (this.dir === "N") ? "W" :
                   (this.dir === "E") ? "N" :
                   (this.dir === "S") ? "E" :
                 /*(this.dir === "W")*/ "S";
    }

    this.turnClockwise = function() {
        this.dir = (this.dir === "N") ? "E" :
                   (this.dir === "E") ? "S" :
                   (this.dir === "S") ? "W" :
                 /*(this.dir === "W")*/ "N";
    }
       
    this.topBitmap = function() {
        return this.bitmaps[this.bitmaps.length - 1];
    }
    
    this.combine = function(f) {
        if (this.bitmaps.length >= 2) {
            var top = this.bitmaps.pop();
            this.topBitmap().combine(top, f);
        }
    }
    
    this.composeFunc = function(c0, c1) {
        return makeColor(
            c0.r + c1.r * (255 - c0.a) / 255,
            c0.g + c1.g * (255 - c0.a) / 255,
            c0.b + c1.b * (255 - c0.a) / 255,
            c0.a + c1.a * (255 - c0.a) / 255);
    }

    this.clipFunc = function(c0, c1) {
        return makeColor(
            c1.r * c0.a / 255,
            c1.g * c0.a / 255,
            c1.b * c0.a / 255,
            c1.a * c0.a / 255);
    }
}
