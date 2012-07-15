/*
 * Copyright (c) 2010 - 2012, BeeDesk, Inc., unless otherwise noted.
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without
 * modification, are permitted provided that the following conditions are met:
 * * Redistributions of source code must retain the above copyright
 *   notice, this list of conditions and the following disclaimer.
 * * Redistributions in binary form must reproduce the above copyright
 *   notice, this list of conditions and the following disclaimer in the
 *   documentation and/or other materials provided with the distribution.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND
 * ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED
 * WARRANTIES OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE
 * DISCLAIMED. IN NO EVENT SHALL BeeDesk, Inc. AND ITS LICENSORS BE LIABLE FOR ANY
 * DIRECT, INDIRECT, INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES
 * (INCLUDING, BUT NOT LIMITED TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES;
 * LOSS OF USE, DATA, OR PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND
 * ON ANY THEORY OF LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT
 * (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 **/

var Dates = new function() {
  // <Mike Koss> - released into the public domain.
  // Obtained from pageforest.com
  //------------------------------------------------------------------
  // ISO 8601 Date Formatting YYYY-MM-DDTHH:MM:SS.sssZ (where Z
  // could be +HH or -HH for non UTC) Note that dates are inherently
  // stored at UTC dates internally. But we infer that they denote
  // local times by default. If the dt.__tz exists, it is assumed to
  // be an integer number of hours offset to the timezone for which
  // the time is to be indicated (e.g., PST = -08). Callers should
  // set dt.__tz = 0 to fix the date at UTC. All other times are
  // adjusted to designate the local timezone.
  // -----------------------------------------------------------------

  // Default timezone = local timezone
  var tzDefault = -(new Date().getTimezoneOffset()) / 60;

  // Return an integer as a string using a fixed number of digits,
  // (require a sign if fSign).
  function fixedDigits(value, digits, fSign) {
      var s = "";
      var fNeg = (value < 0);
      if (digits == undefined) {
          digits = 0;
      }
      if (fNeg) {
          value = -value;
      }
      value = Math.floor(value);

      for (; digits > 0; digits--) {
          s = (value % 10) + s;
          value = Math.floor(value / 10);
      }

      if (fSign || fNeg) {
          s = (fNeg ? "-" : "+") + s;
      }

      return s;
  }

  this.toISOString = function(dt, fTime) {
      var dtT = new Date();
      dtT.setTime(dt.getTime());

      var tz = dt.__tz;
      if (tz == undefined) {
          tz = tzDefault;
      }

      // Adjust the internal (UTC) time to be the local timezone
      // (add tz hours) Note that setTime() and getTime() are always
      // in (internal) UTC time.
      if (tz != 0) {
          dtT.setTime(dtT.getTime() + 60 * 60 * 1000 * tz);
      }

      var s = dtT.getUTCFullYear() + "-" +
          fixedDigits(dtT.getUTCMonth() + 1, 2) + "-" +
          fixedDigits(dtT.getUTCDate(), 2);
      var ms = dtT % (24 * 60 * 60 * 1000);

      if (ms || fTime || tz != 0) {
          s += "T" + fixedDigits(dtT.getUTCHours(), 2) + ":" +
              fixedDigits(dtT.getUTCMinutes(), 2);
          ms = ms % (60 * 1000);
          if (ms) {
              s += ":" + fixedDigits(dtT.getUTCSeconds(), 2);
          }
          if (ms % 1000) {
              s += "." + fixedDigits(dtT.getUTCMilliseconds(), 3);
          }
          if (tz == 0) {
              s += "Z";
          } else {
              s += fixedDigits(tz, 2, true);
          }
      }
      return s;
  };

  var regISO = new RegExp("^(\\d{4})-?(\\d\\d)-?(\\d\\d)" +
                          "(T(\\d\\d):?(\\d\\d):?((\\d\\d)" +
                          "(\\.(\\d{0,6}))?)?(Z|[\\+-]\\d\\d))?$");

  //--------------------------------------------------------------------
  // Parser is more lenient than formatter. Punctuation between date
  // and time parts is optional. We require at the minimum,
  // YYYY-MM-DD. If a time is given, we require at least HH:MM.
  // YYYY-MM-DDTHH:MM:SS.sssZ as well as YYYYMMDDTHHMMSS.sssZ are
  // both acceptable. Note that YYYY-MM-DD is ambiguous. Without a
  // timezone indicator we don't know if this is a UTC midnight or
  // Local midnight. We default to UTC midnight (the ISOFromDate
  // function always writes out non-UTC times so we can append the
  // time zone). Fractional seconds can be from 0 to 6 digits
  // (microseconds maximum)
  // -------------------------------------------------------------------
  this.fromISOString = function(sISO) {
      Arguments.assertNonNullString(sISO, 'expect non null string.');
      var e = {"YYYY": 1, "MM": 2, "DD": 3, "hh": 5,
               'mm': 6, "ss": 8, "sss": 10, "tz": 11};
      var aParts = sISO.match(regISO);
      if (!aParts) {
          return undefined;
      }

      aParts[e.mm] = aParts[e.mm] || 0;
      aParts[e.ss] = aParts[e.ss] || 0;
      aParts[e.sss] = aParts[e.sss] || 0;

      // Convert fractional seconds to milliseconds
      aParts[e.sss] = Math.round(+('0.' + aParts[e.sss]) * 1000);
      if (!aParts[e.tz] || aParts[e.tz] === "Z") {
          aParts[e.tz] = 0;
      } else {
          aParts[e.tz] = parseInt(aParts[e.tz]);
      }

      // Out of bounds checking - we don't check days of the month is correct!
      if (aParts[e.MM] > 59 || aParts[e.DD] > 31 ||
          aParts[e.hh] > 23 || aParts[e.mm] > 59 || aParts[e.ss] > 59 ||
          aParts[e.tz] < -23 || aParts[e.tz] > 23) {
          return undefined;
      }

      var dt = new Date();

      dt.setUTCFullYear(aParts[e.YYYY], aParts[e.MM] - 1, aParts[e.DD]);

      if (aParts[e.hh]) {
          dt.setUTCHours(aParts[e.hh], aParts[e.mm],
                         aParts[e.ss], aParts[e.sss]);
      } else {
          dt.setUTCHours(0, 0, 0, 0);
      }

      // BUG: For best compatibility - could set tz to undefined if
      // it is our local tz Correct time to UTC standard (utc = t -
      // tz)
      dt.__tz = aParts[e.tz];
      if (aParts[e.tz]) {
          dt.setTime(dt.getTime() - dt.__tz * (60 * 60 * 1000));
      }
      return dt;
  };
  // </Mike Koss>

  this.isPast = function(datetime) {
    var result = false;
    var date = new Date(datetime);
    var now = new Date();
    if (date >= now) {
      result = true;
    }
    return result;
  };
  this.isRecent = function(datetime) {
    var result = false;
    var date = Date.parseExact(datetime, "yyyy-MM-ddTHH:mm:ss");
    if (!!date) {
      var past = new Date().add(-2).hour();
      var soon = new Date().add(+2).hour();
      if (date.between(past, soon)) {
        result = true;
      }
    } else {
      console.error("date: [" + datetime + "] typeof: [" + typeof(dateitem) + "]");
    }
    return result;
  };
  this.getReadableInterval = function(datetime) {
    throw "Not implemented";
  };
  return this;
};

var Threads = new function() {
  /**
   * A utility to make it easy to perform an action conditioning
   * on all async calls' results ready
   *
   * Usage:
   * var river = Threads.river();
   * river.join(
   *   async1(param1, river.branch("entry")),
   *   async1(param2, river.branch("group")),
   *   function(joined) {
   *     var entry = joined.entry[0];
   *     var group = joined.group[1];
   *   }
   * );
   */
  this.river = function() {
    var result = new function() {
      var instance = this;
      var names = {};
      var args = {};
      var size = 0;
      var count = 0;
      var fun;

      instance.branch = function(name) {
        if (names[name] !== undefined) {
          throw "Duplicated name";
        } else {
          names[name] = name;
        }

        var pos = size++;
        var method = function(list) {
          if (args[name] === undefined) {
            count++;
            args[name] = Array.prototype.slice.call(arguments);
            if (count === size) {
              if (!!fun) {
                fun.apply(this, [args]);
              }
            }
          } else {
            console.error("Duplicated call.");
          }
        };
        return method;
      };
      instance.join = function(oneormorebranches, fn) {
        fun = arguments[arguments.length - 1];
        Arguments.assertNonNullFn(fun);

        // join might be called at last, if calls to branches are synchronous
        if (count === size) {
          fun.apply(this, [args]);
        }
      };
    };
    return result;
  };

  this.latchbinder = function() {
    var result = new function() {
      var instance = this;
      var caller, args;
      var queue = [];
      this.latch = function() {
        if (!caller) {
          caller = this;
          args = Array.prototype.slice.call(arguments);
          for (var i=0,len=queue.length; i<len; i++) {
            queue[i].apply(caller, args);
          }
          queue = null;
        }
      };
      this.bind = function(fn) {
        if (caller) {
          fn.apply(caller, args);
        } else {
          queue.push(fn);
        }
      };
    };
    return result;
  };
};

var Matches = new function() {
  var instance = this;

  instance.match = function(entry, filters) {
    var result = false;
    if (!$.isFunction(filters)) {
      var matchAll = true;
      var matchSome = false;
      for (var key in filters) {
        if (entry === undefined) {
          // problematic
          matchAll = false;
          break;
        } else if (filters[key] !== entry[key]) {
          matchAll = false;
          break;
        }
        matchSome = true; // make sure filter is non-empty
      }
      result = matchSome && matchAll;
    } else {
      result = filters(entry);
    }
    return result;
  };
  return instance;
};
// Backward compatibility
var Finds = Matches;

var HashSearch = new function() {
  this.getSearchString = function(search) {
    var result = '';
    for (var item in search) {
        if (result.length !== 0) {
            result += '&';
        }
        result += item + '=' + encodeURIComponent(search[item]);
    }
    if (result.length > 0) {
        result = '?' + result;
    }
    return result;
  };

  this.search = function(q) {
    // Andy E and other @http://stackoverflow.com/posts/2880929/revisions
    var results = {};
    var e,
        a = /\+/g,  // Regex for replacing addition symbol with a space
        r = /([^&=]+)=?([^&]*)/g,
        d = function (s) { return decodeURIComponent(s.replace(a, " ")); };

    while (e = r.exec(q)) {
       results[d(e[1])] = d(e[2]);
    }
    return results;
  };
  return this;
};

var Selectors = new function() {
  var instance = this;

  /***
   * Translate: 
   *     ['input', 'textarea'], {name: 'foo', value: null} 
   * into
   *     'input[name="foo"][value], textarea[name="foo"][value]
   */
  instance.compose = function(tags, options) {
    var params = [];
    var selectors = [];
    for (var key in options) {
      var seg;
      var val = options[key];
      if (val !== undefined && val !== null) {
        seg = '[' + key + '="' + options[key] + '"]';
      } else {
        seg = '[' + key + ']';
      }
      params.push(seg);
    }

    for (var i=0, len=tags.length; i<len; i++) {
      var sel = tags[i];
      selectors.push(sel + Strings.concat(params));
    }
    return Strings.concat(selectors, ', ');
  };

  return instance;
};

var Strings = new function() {
  var instance = this;
  instance.has = function(string, fullname) {
    new RegExp('(^|\\s)' + fullname + '(\\s|$)').test(string);
  };
  instance.format = function(args) {
    // credit: http://www.thirstymind.org/2009/10/17/
    // implementing-pythons-string-format-in-javascript/
    var formatted_str = arguments[0] || '';

    for(var i=1; i<arguments.length; i++){
        var re = new RegExp("\\{"+(i-1)+"}", "gim");
        formatted_str = formatted_str.replace(re, arguments[i]);
    }
    
    return formatted_str;
  };
  instance.join = function(delim, strs) {
    /* arguments should've been swaped. Use concat() */
    delim = delim || ''; 
    if (strs.length === 0)
        return '';

    var result = strs[0];
    for (var i=1, len=strs.length; i<len; i++) {
        result += delim;
        result += strs[i];
    }
    return result;
  };
  instance.concat = function(strs, delim) {
    return Strings.join(delim, strs);
  };
  instance.keyvalue = function(str, delimit) {
    var result = {key: '', value: ''};
    var len = !!str? str.length: 0;
    var index = len>0? str.indexOf(delimit): -1;
    if (index > 0) {
      result.key = str.substring(0, index);
    }
    if (index < len) {
      result.value = str.substring(index + 1);
    }
    return result;
  };
  instance.fill = function(segment, count) {
    var result = [];
    if (count == 0) {
        // no op
    } else if (count == 1) {
      result[0] = segment;
    } else {
      for (var i=0; i<count; i++) {
        result[i] = segment;
      }
    }
    return result;
  };
  instance.mysqlquote = function(name) {
    return "`" + name.replace("`", "``") + "`";
  };
  instance.mssqlquote = function(name) {
    return "[" + name.replace("]", "]]") + "]";
  };
  instance.trim = function(str) {
    return str.replace(/^\s+|\s+$/, '');
  };
  instance.startsWith = function(str, prefix) {
    return str.indexOf(prefix) === 0;
  };
  instance.endsWith = function(str, suffix) {
    return str.indexOf(suffix, str.length - suffix.length) !== -1;
  };
  return instance;
};

var Hashs = new function() {
  this.apply = function(fn, items) {
    var result = {};
    for (var key in items) {
      result[key] = fn(key, items[key]);
    }
    return result;
  };
  this.has = function(obj, key) {
    var result = false;
    if (!!obj) {
      for (var name in obj) {
        if (name === key) {
          result = true;
          break;
        }
      }
    }
    return result;
  };
  this.isEmpty = function(obj) {
    var result = true;
    if (!!obj) {
      for (var name in obj) {
        result = false;
        break;
      }
    }
    return result;
  };
  this.size = function(obj) {
    var result = 0;
    if (!!obj) {
      for (var name in obj) {
        ++result;
      }
    }
    return result;
  };
  this.simplify = function(formarray) {
    var result = {};
    for (var i=0, len=formarray.length; i<len; i++) {
      result[formarray[i].name] = formarray[i].value;
    }
    return result;
  };

  // <isEquals>
  // http://www.pageforest.com/lib/beta/js/pf-client.js : namespace.lookup('org.startpad.base')
  function generalType(o) {
    var t = typeof(o);
    if (t != 'object') {
        return t;
    }
    if (o instanceof String) {
        return 'string';
    }
    if (o instanceof Number) {
        return 'number';
    }
    return t;
  }

  function keys(map) {
    var list = [];

    for (var prop in map) {
        if (map.hasOwnProperty(prop)) {
            list.push(prop);
        }
    }
    return list;
  }

  /* Sort elements and remove duplicates from array (modified in place) */
  function uniqueArray(a) {
    if (!(a instanceof Array)) {
        return;
    }
    a.sort();
    for (var i = 1; i < a.length; i++) {
      if (a[i - 1] == a[i]) {
          a.splice(i, 1);
      }
    }
  }

  //Perform a deep comparison to check if two objects are equal.
  //Inspired by Underscore.js 1.1.0 - some semantics modifed.
  //Undefined properties are treated the same as un-set properties
  //in both Arrays and Objects.
  //Note that two objects with the same OWN properties can be equal
  //if they have different prototype chains (and inherited values).
  this.isEquals = function isEqual(a, b) {
    if (a === b) {
        return true;
    }
    if (generalType(a) != generalType(b)) {
        return false;
    }
    if (a == b) {
        return true;
    }
    if (typeof a != 'object') {
        return false;
    }
    // null != {}
    if (a instanceof Object != b instanceof Object) {
        return false;
    }

    if (a instanceof Date || b instanceof Date) {
        if (a instanceof Date != b instanceof Date ||
            a.getTime() != b.getTime()) {
            return false;
        }
    }

    var allKeys = [].concat(keys(a), keys(b));
    uniqueArray(allKeys);

    for (var i = 0; i < allKeys.length; i++) {
        var prop = allKeys[i];
        if (!isEqual(a[prop], b[prop])) {
            return false;
        }
    }
    return true;
  };
  // </isEquals>

  return this;
};

var URLs = new function() {
  var instance = this;

  // This function creates a new anchor element and uses location
  // properties (inherent) to get the desired URL data. Some String
  // operations are used (to normalize results across browsers).
  // Credit: http://james.padolsey.com/javascript/parsing-urls-with-the-dom/
  instance.parse = function(url) {
     var a =  document.createElement('a');
     a.href = url;
     return {
         source: url,
         protocol: a.protocol.replace(':',''),
         host: a.hostname,
         port: a.port,
         query: a.search,
         params: (function(){
             var ret = {},
                 seg = a.search.replace(/^\?/,'').split('&'),
                 len = seg.length, i = 0, s;
             for (;i<len;i++) {
                 if (!seg[i]) { continue; }
                 s = seg[i].split('=');
                 ret[s[0]] = s[1];
             }
             return ret;
         })(),
         file: (a.pathname.match(/\/([^\/?#]+)$/i) || [,''])[1],
         hash: a.hash.replace('#',''),
         path: a.pathname.replace(/^([^\/])/,'/$1'),
         relative: (a.href.match(/tps?:\/\/[^\/]+(.+)/) || [,''])[1],
         segments: a.pathname.replace(/^\//,'').split('/')
     };
  };
  instance.join = function(parts) {
    var url = '';
    if (parts.protocol) {
      url = parts.protocol + '://';
    }
    if (parts.host) {
      url = url + parts.host;
    }
    if (parts.port !== null && parts.port !== undefined && parts.port !== '0') {
      // bug on (port === '0') if not specified?
      url = url + ':' + parts.port;
    }
    if (parts.path) {
      url = url + parts.path;
    } else {
      url = url + '/';
    }
    if (parts.query) {
      url = url + '?' + parts.query;
    }
    if (parts.hash) {
      url = url + '#' + parts.hash;
    }
    return url;
  };
  return instance;
};
                           
var NameArrays = new function() {
  var instance = this;
  this.path = function(node, zeroormore) {
    var result = undefined;
    if (arguments.length === 1) {
      result = node;
    } else if (node.children !== undefined && node.children.length > 0){
      var pathname = arguments[1];
      for (var i=0, len=node.children.length; i<len; i++) {
        if (node.children[i].name === pathname) {
          var args = Array.prototype.slice.call(arguments);
          args.splice(0, 2, node.children[i]);
          result = instance.path.apply(this, args);
          break;
        }
      }
    }
    return result;
  };
};

var Arrays = new function() {
  var instance = this;
  instance.apply = function(fn, items) {
    var result = [];
    for (var i = 0; i < items.length; ++i) {
      result[i] = fn(items[i]);
    }
    return result;
  };
  instance.contains = function(array, that) {
    var contained = false;
    for (var i=array.length-1; i >= 0; i--) {
      var ths = array[i];
      if (ths === that) {
        contained = true;
      }
    }
    return contained;
  };
  instance.extract = function(names, entity) {
    var result = [];
    for (var i = 0; i < names.length; ++i) {
      var item = entity[names[i]];
      if (item === undefined || item === null) {
        result[i] = null;
      } else {
        result[i] = item;
      }
    }
    return result;
  };
  instance.order = function(array) {
    var result = {};
    for (var i=array.length-1; i >= 0; i--) {
      result[array] = i;
    }
    return result;
  };
  instance.keys = function(hash) {
    var result = [];
    for (var key in hash) {
      result.push(key);
    }
    return result;
  };
  instance.intersect = function(ths, that, sorted) {
    // intersect 2 arrays and return 3 (left, middle, right) where the middle is
    // the intersect, left is left-only, etc.
    var ai=0, bi=0;
    var result = {left: [], middle: [], right: []};
    if (ths === undefined || ths === null) {
      ths = [];
    }
    if (that === undefined || that === null) {
      that = [];
    }
    if (sorted !== true) {
      ths.sort();
      that.sort();
    }

    while(ai < ths.length || bi < that.length ) {
      if (bi >= that.length) {
        result.left.push(ths[ai]);
        ai++;
      } else if (ai >= ths.length) {
        result.right.push(that[bi]);
        bi++;
      } else if (ths[ai] < that[bi]) {
        result.left.push(ths[ai]);
        ai++;
      } else if (ths[ai] > that[bi]) {
        result.right.push(that[bi]);
        bi++;
      } else /* they're equal */ {
        result.middle.push(ths[ai]);
        ai++;
        bi++;
      }
    }
    return result;
  };
  instance.collect = function(array) {
    var fn = function(entry) {
      array.push(entry);
    };
    return fn;
  };
  instance.clone = function(array) {
    return array.slice(0);
  };
  instance.remove = function(array, from, to) {
    //Array Remove - By John Resig (MIT Licensed)
    var rest = array.slice((to || from) + 1 || array.length);
    array.length = from < 0 ? array.length + from : from;
    return array.push.apply(array, rest);
  };
  return instance;
};

// Example of HashArray: [{id: 'foo', title: 'title'}, {id: 'bar'}]
var HashArrays = new function() {
  var instance = this;

  instance.remove = function(array, filter) {
    var result = [];
    for (var i=(array.length - 1); i>=0; i--) {
      var item = array[i];
      if (Matches.match(item, filter)) {
        result.push(item);
        array.splice(i, 1);
      }
    }
    return result.reverse();
  };
  instance.find = function(array, filters) {
    var result = [];
    for (var i=0, len=array.length; i<len; i++) {
      var item = array[i];
      if (Matches.match(item, filters)) {
        result.push(item);
      }
    }
    return result;
  };
  instance.findOnce = function(array, filters) {
    var result = undefined;
    for (var i=0, len=array.length; i<len; i++) {
      var item = array[i];

      if (Matches.match(item, filters)) {
        result = item;
        break;
      }
    }
    return result;
  };
  return instance;
};

var Arguments = new function() {

  var instance = this;

  this.isNonNull = function(arg) {
    return (arg !== undefined && arg !== null);
  };
  this.assertNonNull = function(arg, message) {
    if (!instance.isNonNull(arg)) {
      console.error(message || 'Parameter is null');
      throw(message || 'Parameter is null');
    }
  };
  this.warnNonNull = function(arg, message) {
    if (!instance.isNonNull(arg)) {
      console.warn(message || 'Parameter is null');
    }
  };
  this.isNonNullString = function(arg) {
    return (arg !== undefined && arg !== null && typeof(arg) === 'string');
  };
  this.assertNonNullString = function(arg, message) {
    if (!instance.isNonNullString(arg)) {
      console.error(message || 'Parameter is null');
      throw(message || 'Parameter is null');
    }
  };
  this.warnNonNullString = function(arg, message) {
    if (!instance.isNonNullString(arg)) {
      console.warn(message || 'Parameter is null');
    }
  };
  this.isNonNullFn = function(arg) {
    return (arg !== undefined && arg !== null && $.isFunction(arg));
  };
  this.assertNonNullFn = function(arg, message) {
    if (!instance.isNonNullFn(arg)) {
      console.error(message || 'Parameter is null');
      throw(message || 'Parameter is null');
    }
  };
  this.warnNonNullFn = function(arg, message) {
    if (!instance.isNonNullFn(arg)) {
      console.warn(message || 'Parameter is null');
    }
  };
  this.isNonNullDataObject = function(arg) {
    return (arg !== undefined && arg !== null && !$.isFunction(arg) && arg.prototype === undefined);
  };
  this.assertNonNullDataObject = function(arg, message) {
    if (!instance.isNonNullDataObject(arg)) {
      console.error(message || 'Parameter is null');
      throw(message || 'Parameter is null');
    }
  };
  this.warnNonNullDataObject = function(arg, message) {
    if (!instance.isNonNullDataObject(arg)) {
      console.warn(message || 'Parameter is null');
    }
  };
  return this;
};

/**
 * Supports trigger, bind, unbind
 * 
 * @author: thomas at beedesk DOT com
 */
var Binds = new function() {
  var instance = this;

  function Binder(conf) {
    var binder = {};
    var handlers = [];

    binder.bind = function(type, fn) {
      var filter = typeof(type) === "string"?  {type: type}: type;
      var handler = $.extend({fn: fn}, filter);
      return handlers.push(handler);
    };
    binder.unbind = function(type, fn) {
      var filter = typeof(type) === "string"?  {type: type}: type;
      filter = fn === undefined? filter: $.extend({fn: fn}, filter);
      HashArrays.remove(handlers, filter);
    };
    binder.trigger = function(type, oneormoreparams) {
      var count = 0;

      var args = Array.prototype.slice.call(arguments).splice(1);
      var filter = typeof(type) === "string"?  {type: type}: type;
      var matches = HashArrays.find(handlers, filter);
      var wildcards = HashArrays.find(handlers, {type: '*'});

      var items = [].concat(matches).concat(wildcards);
      for (var j=0, len=items.length; j < len; j++) {
        count++;
        ret = items[j].fn.apply(this, args);
        if (ret === false) {
          break;
        }
      }
      return count;
    };
    return binder;
  };
  
  instance.simple = function(conf) {
    return new Binder(conf);
  };
  instance.retentive = function(conf) {
    var binder = {};
    var inner = new Binder(conf);
    var events = [];

    binder.bind = function(type, fn) {
      var result = inner.bind.apply(this, arguments);

      var matched = type==='*'? events: HashArrays.find(events, {type: type});
      for (var i=0, len=matched.length; i<len; i++) {
        fn.apply(this, matched[i].arguments);
      }
      
      return result;
    };
    binder.unbind = function(type, fn) {
      return inner.unbind.apply(this, arguments);
    };
    binder.trigger = function(type, args) {
      var result = inner.trigger.apply(this, arguments);

      var args = Array.prototype.slice.call(arguments).splice(1);
      events.push({type: type, arguments: args});

      return result;
    };
    binder.forget = function(conf) {
      events = [];
      return binder;
    };

    return binder; 
  };

  return instance;
};

function Binder() {
  return Binds.simple();
}

var Base64 = new function() {
  // This code was written by Tyler Akins and has been placed in the
  // public domain.  It would be nice if you left this header intact.
  // Base64 code from Tyler Akins -- http://rumkin.com
  var keyStr = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/=";

  var ua = navigator.userAgent.toLowerCase();
  if (ua.indexOf(" chrome/") >= 0 || ua.indexOf(" firefox/") >= 0 || ua.indexOf(' gecko/') >= 0) {
    var StringMaker = function () {
      this.str = "";
      this.length = 0;
      this.append = function (s) {
        this.str += s;
        this.length += s.length;
      };
      this.prepend = function (s) {
        this.str = s + this.str;
        this.length += s.length;
      };
      this.toString = function () {
        return this.str;
      };
    };
  } else {
    var StringMaker = function () {
      this.parts = [];
      this.length = 0;
      this.append = function (s) {
        this.parts.push(s);
        this.length += s.length;
      };
      this.prepend = function (s) {
        this.parts.unshift(s);
        this.length += s.length;
      };
      this.toString = function () {
        return this.parts.join('');
      };
    };
  }

  this.encode = function(input) {
    var output = new StringMaker();
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    while (i < input.length) {
      chr1 = input.charCodeAt(i++);
      chr2 = input.charCodeAt(i++);
      chr3 = input.charCodeAt(i++);

      enc1 = chr1 >> 2;
      enc2 = ((chr1 & 3) << 4) | (chr2 >> 4);
      enc3 = ((chr2 & 15) << 2) | (chr3 >> 6);
      enc4 = chr3 & 63;

      if (isNaN(chr2)) {
        enc3 = enc4 = 64;
      } else if (isNaN(chr3)) {
        enc4 = 64;
      }
      output.append(keyStr.charAt(enc1) + keyStr.charAt(enc2) + keyStr.charAt(enc3) + keyStr.charAt(enc4));
    }
    return output.toString();
  };

  this.decode = function(input) {
    var output = new StringMaker();
    var chr1, chr2, chr3;
    var enc1, enc2, enc3, enc4;
    var i = 0;

    // remove all characters that are not A-Z, a-z, 0-9, +, /, or =
    input = input.replace(/[^A-Za-z0-9\+\/\=]/g, "");

    while (i < input.length) {
      enc1 = keyStr.indexOf(input.charAt(i++));
      enc2 = keyStr.indexOf(input.charAt(i++));
      enc3 = keyStr.indexOf(input.charAt(i++));
      enc4 = keyStr.indexOf(input.charAt(i++));

      chr1 = (enc1 << 2) | (enc2 >> 4);
      chr2 = ((enc2 & 15) << 4) | (enc3 >> 2);
      chr3 = ((enc3 & 3) << 6) | enc4;

      output.append(String.fromCharCode(chr1));

      if (enc3 != 64) {
        output.append(String.fromCharCode(chr2));
      }
      if (enc4 != 64) {
        output.append(String.fromCharCode(chr3));
      }
    }
    return output.toString();
  };

  return this;
};

/**
 * Random UUID-like string generator
 *
 * http://bytes.com/topic/javascript/answers/523253-how-create-guid-javascript
 */
function guid() {
  function S4() {
    return (((1+Math.random())*0x10000)|0).toString(16).substring(1);
  }
  return (S4()+S4()+"-"+S4()+"-"+S4()+"-"+S4()+"-"+S4()+S4()+S4());
};

/**
 * Immutatable (normalized) date.
 */
function QuickDate(dateOrYear, month, dayOfMonth) {
  if (typeof dateOrYear == 'undefined') {
    var date = new Date();
    this.date = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 0, 0, 0, 0);
  } else if (typeof dateOrYear == 'number' && typeof month == 'number' && typeof dateOfMonth == 'number') {
    this.date = new Date(dateOrYear, month, dayOfMonth, 0, 0, 0, 0);
  } else if (typeof dateOrYear == 'number') {
    this.date = new Date(dateOrYear); // milli
  } else {
    this.date = new Date(dateOrYear.getFullYear(), dateOrYear.getMonth(), dateOrYear.getDay(), 0, 0, 0, 0);
  }

  this.getOffsetDay = function(offset) {
    var result;

    if (offset == 0) {
      result = this;
    } else {
      var milli = this.date.getTime();
      milli += offset * 24 * 60 * 60 * 1000;
      result = new QuickDate(milli);
    }
    return result;
  };

  this.getFirstDayOfMonth = function() {
    var result;
    result = this.getOffsetDay(- (this.getDate()-1)); // (1-base) the day of the month;
    return result;
  };

  this.getFirstDayOfWeek = function() {
    var result;
    result = this.getOffsetDay(- this.getDay());
    return result;
  };

  this.getFirstDayOfYear = function() {
    var result = new QuickDate(); // (1-base) the day of the month
    result.date.setFullYear(this.date.getFullYear(), 0, 1);
    return result;
  };

  this.getUnixZero = function() {
    var result;
    result = new QuickDate(1990, 0, 1);
    return result;
  };

  this.getUnixLarge = function() {
    var result;
    result = new QuickDate(2999, 0, 1);
    return result;
  };

  this.getUnixDay = function() {
    var zero = new Date(1990, 0, 1);
    var result = Math.floor((this.date.getTime() - zero.getTime()) / (24 * 60 * 60 * 1000));
    return result;
  };

  this.getUnixYear = function() {
    var result = this.date.getYear() - 1970;
    return result;
  };

  this.getUnixMonth = function() {
    var result = (this.date.getYear() - 1970) * 12 + (this.date.getMonth() - 0);
    return result;
  };

  this.getUnixWeek = function() {
    var zero = new Date(1969, 11, 28, 0, 0, 0, 0).getTime();  // 12/28/1969 to 1/4/1970 being the week zero
    var today = this.date.getTime();
    var result = Math.floor((today - zero) / (24 * 60 * 60 * 1000 * 7));
    return result;
  };

  this.getGenerationZero = function() {
    var result = new QuickDate(); // (1-base) the day of the month
    result.date.setFullYear(1900, 0, 1);
    return result;
  };

  this.getDay = function() {
    return this.date.getDay();
  };

  this.getDate = function() {
    return this.date.getDate();
  };

  this.getMonth = function() {
    return this.date.getMonth();
  };

  this.getFullYear = function() {
    return this.date.getFullYear();
  };

  this.getShortFullYear = function() {
    var result;
    var thisYear = new QuickDate().getFullYear();
    var year = this.date.getFullYear();
    if (thisYear - 80 < year && year <= thisYear + 20) {
      var temp = year % 100;
      if (temp <= 9) {
        result = "'0" + temp;
      } else {
        result = "'" + temp;
      }
    } else {
      result = year;
    }
    return result;
  };

  this.UTC = function() {
    return this.date.UTC();
  };

  this.toDate = function() {
    return new Date(this.date.getTime());
  };

  this.toString = function() {
    return this.date.toDateString();
  };
};

