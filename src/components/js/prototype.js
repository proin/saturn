/*
 * String Prototypes
 */

String.prototype.startsWith = function (suffix) {
    return !(this.indexOf(suffix) !== 0);
};

String.prototype.endsWith = function (suffix) {
    return this.indexOf(suffix, this.length - suffix.length) !== -1;
};

String.prototype.escape = function () {
    var result = this;
    result = result.replace(/\r/gim, '').replace(/\t/gim, '').replace(/\n/gim, '');
    while (result.startsWith(' ')) result = result.substring(1, result.length);
    while (result.endsWith(' ')) result = result.substring(0, result.length - 1);
    return result;
};

/*
 * Function Prototypes
 */

Function.prototype.getParamNames = function () {
    var STRIP_COMMENTS = /((\/\/.*$)|(\/\*[\s\S]*?\*\/))/mg;
    var ARGUMENT_NAMES = /([^\s,]+)/g;
    var fnStr = this.toString().replace(STRIP_COMMENTS, '');
    var result = fnStr.slice(fnStr.indexOf('(') + 1, fnStr.indexOf(')')).match(ARGUMENT_NAMES);
    if (result === null)
        result = [];
    return result;
};

Function.prototype.map = function (map) {
    var params = this.getParamNames();
    var fn = this;
    for (var i in params)
        fn = fn.bind({}, map[params[i]]);
    return fn;
};

/*
 * Array Prototypes
 */

Array.prototype.remove = function (index) {
    this.splice(index, 1);
};


/*
 * Date
 */

Date.prototype.day = function (val) {
    return new Date(this.getTime() + val * 1000 * 60 * 60 * 24);
};

Date.prototype.format = function (f) {
    if (!this.valueOf()) return " ";

    var weekName = ["일요일", "월요일", "화요일", "수요일", "목요일", "금요일", "토요일"];
    var d = this;

    return f.replace(/(yyyy|yy|MM|dd|E|hh|mm|ss|a\/p)/gi, function ($1) {
        switch ($1) {
            case "yyyy":
                return d.getFullYear();
            case "yy":
                return (d.getFullYear() % 1000).zf(2);
            case "MM":
                return (d.getMonth() + 1).zf(2);
            case "dd":
                return d.getDate().zf(2);
            case "E":
                return weekName[d.getDay()];
            case "HH":
                return d.getHours().zf(2);
            case "hh":
                return ((h = d.getHours() % 12) ? h : 12).zf(2);
            case "mm":
                return d.getMinutes().zf(2);
            case "ss":
                return d.getSeconds().zf(2);
            case "a/p":
                return d.getHours() < 12 ? "오전" : "오후";
            default:
                return $1;
        }
    });
};

String.prototype.string = function (len) {
    var s = '', i = 0;
    while (i++ < len) {
        s += this;
    }
    return s;
};

String.prototype.zf = function (len) {
    return "0".string(len - this.length) + this;
};

Number.prototype.zf = function (len) {
    return this.toString().zf(len);
};