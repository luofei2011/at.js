(function(win) {
    var oproto = Object.prototype.toString;

    var isObject = function(o) {
        return oproto.call(o) === "[object Object]";
    };

    var isArray = function(o) {
        return oproto.call(o) === "[object Array]";
    };

    var extend = function() {
        var target = isObject(arguments[0]) ? arguments[0] : {};
        var needCopy = [].slice.call(arguments, 1);
        var len = needCopy.length;
        var i;

        for (i = 0; i < len; i++) {
            var tmp = needCopy[i];
            for (var o in tmp) {
                target[o] = tmp[o];
            }
        }

        return target;
    };

    var createStyle = function(str) {
        var style = document.createElement('style');
        // this is important for ie678
        style.setAttribute('type', 'text/css');
        if (style.styleSheet) {
            style.styleSheet.cssText = str;
        } else {
            var cssText = document.createTextNode(str);
            style.appendChild(cssText);
        }
        document.body.appendChild(style);
    };

    /**
     * 发起一次异步请求，支持跨域
     * 使用方法类似jQuery.ajax
     * @param {Object} opt 具体配置信息参考prototype中的opt
     */
    function Ajax(opt) {
        var option = extend({}, this.opt, opt);
        // 初始化xhr
        this.xhr = this.createXhrObject();
        // 入口函数，判断发起普通get或者post请求还是跨域请求
        this.init = function() {
            option.dataType = option.dataType || option.datatype;
            if (option.dataType && option.dataType.toLowerCase() === 'jsonp') {
                this.jsonp();
            } else {
                this.request();
            }
        }
        this.request = function() {
            var self = this;
            this.xhr.onreadystatechange = function() {
                if (self.xhr.readyState !== 4) return;
                (self.xhr.status === 200) ?
                    (option.always ? option.always(self.xhr.responseText, self.xhr.responseXML) : option.success(self.xhr.responseText, self.xhr.responseXML)) : option.fail(self.xhr, self.xhr.status);
            };

            if (option.method.toLowerCase() !== 'post') {
                option.url += "?" + this.stringify(option.data);
                option.data = null;
            } else {
                option.data = this.stringify(option.data);
            }

            this.xhr.open(option.method, option.url, true);
            // 加上Header信息
            this.xhr.setRequestHeader("Content-type","application/x-www-form-urlencoded");
            // 发送序列化的数据
            this.xhr.send(option.data);
        };

        // 发起跨域请求，默认的参数为callback
        // 注意：跨域只支持get请求
        this.jsonp = function() {
            var head = document.getElementsByTagName('head')[0];
            var script = document.createElement('script');
            script.type = "text/javascript";

            var cb = "__at_xhr_" + (+new Date()) + Math.floor(Math.random() * 1000);
            // 跨域请求中调用的前端函数
            window[cb] = function(response) {
                // 尽量返回标准的json格式数据
                try {
                    response = JSON.parse(response);
                } catch(e) {}
                option.success(response);
            }

            // 追加跨域标志参数
            option.data[option.jsonp] = cb;
            option.data = this.stringify(option.data);

            if (script.onreadystatechange) {
                script.onreadystatechange = loadedListener;
            } else {
                script.onload = loadedListener;
            }

            script.src = option.url + "?" + option.data;
            head.appendChild(script);

            // 跨域请求完成后的回调函数
            function loadedListener() {
                head.removeChild(script);
                try {
                    delete window[cb];
                } catch(e) { 
                    window[cb] = undefined;
                }
            }
        }

        this.init();
    }

    Ajax.prototype = {
        constructor: Ajax,
        opt: {
            // 异步请求的地址
            url: '',
            // 异步请求方法：post、get
            method: 'post',
            // 需要传递的数据，类型为Object
            data: null,
            // 返回的数据类型
            // 如果跨域，则用jsonp
            dataType: 'json',
            // 跨域请求中和服务器的交互字段
            jsonp: 'callback',
            // 请求成功的响应函数
            success: function() {},
            // 请求失败后的响应函数
            fail: function() {},
            // 不管成功或者失败都会执行的函数
            always: null
        },
        // 单例模式的构造xhr函数
        // 立即执行，在生命周期内不会再针对浏览器特性进行判断
        createXhrObject: function() {
            var methods = [
                function() { return new XMLHttpRequest(); },
                function() { return new ActiveXObject("Msxml2.XMLHTTP"); },
                function() { return new ActiveXObject("Microsoft.XMLHTTP"); }
            ];

            for (var i = 0, len = methods.length; i < len; i++) {
                try {
                    methods[i];
                } catch(e) {
                    continue;
                }

                this.createXhrObject = methods[i];
                return methods[i];
                //break;
            }
        }(),
        // 序列化Object数据
        stringify: function(obj) {
            return JSON.stringify(obj).replace(/["{}]/g, "")
                                      .replace(/\b:\b/g, "=")
                                      .replace(/\b,\b/g, "&");
        }
    }

    /**
     * 添加事件
     * @param {HTML-Object} el
     * @param {String} type
     * @param {Function} fn 执行函数
     */
    var addEvent = (function() {
        if (document.addEventListener) {
            return function(el, type, fn) {
                el.addEventListener(type, fn, false);
            }
        } else if (document.attachEvent) {
            return function(el, type, fn) {
                // 兼容event事件
                el.attachEvent('on' + type, function() {
                    return fn.call(el, window.event);
                });
            }
        }
    })();

    /**
     * 触发DOM节点上的绑定的事件
     * @param {HTML-Object} el
     * @param {String} type 事件类型：click/mouseup/something
     * @param {All} data 任何类型的数据,透传给事件响应函数
     */
    var triggerEvent = function(el, type, data) {
        var event;
        if (document.createEvent) {
            event = new Event(type);
            event.data = data;
            el.dispatchEvent(event);
        } else {
            event = document.createEventObject();
            event.data = data;
            el.fireEvent('on' + type, event);
        }
        
        // data的得到方式
        /*
        function(e) {
            var data = e.data;
        }
        */
    }

    /**
     * 去掉数据两端的空格
     * @param {String} str
     * @return {String}
     */
    var trim = function(str) {
        return str.replace(/^\s*|\s*$/g, '');
    }

    /**
     * 得到节点的偏移位置
     * @param {HTML-Object} e
     * @return {Number} offset
     */
    var getOffsetTop = function(e) {
        var offset = e.offsetTop;
        if (e.offsetParent != null) offset += getOffsetTop(e.offsetParent);

        return offset;
    }

    /**
     * 得到节点的偏移位置
     * @param {HTML-Object} e
     * @return {Number} offset
     */
    var getOffsetLeft = function(e) {
        var offset = e.offsetLeft;
        if (e.offsetParent != null) offset += getOffsetLeft(e.offsetParent);

        return offset;
    }

    /**
     * 得到textarea中的光标位置
     * @param {HTML-Object} el textarea节点
     * @return {Object} 光标位置
     */
    var getCursorPosition = function(el) {
        var start = 0, end = 0, normalizeValue, range,
            textInputRange, len, endRange;

        if (typeof el.selectionStart == 'number' && typeof el.selectionEnd == 'number') {
            start = el.selectionStart;
            end = el.selectionEnd;
        } else {
            range = document.selection.createRange();
            if (range && range.parentElement() == el) {
                len = el.value.length;
                normalizeValue = el.value.replace(/\r\n/g, "\n");

                textInputRange = el.createTextRange();
                textInputRange.moveToBookmark(range.getBookmark());

                endRange = el.createTextRange();
                endRange.collapse(false);

                if (textInputRange.compareEndPoints('StartEnd', endRange) > -1) {
                    star = end = len;
                } else {
                    start = -textInputRange.moveStart('character', -len);
                    start += normalizeValue.slice(0, start).split('\n').length - 1;

                    if (textInputRange.compareEndPoints('EndToEnd', endRange) > -1) {
                        end = len;
                    } else {
                        end = -textInputRange.moveEnd('character', -len);
                        end += normalizeValue.slice(0, end).split('\n').length - 1;
                    }
                }
            }
        }

        return {
            start: start,
            end: end
        }
    }

    /**
     * 设置textarea节点的光标位置
     * @param {HTML-Object} el
     * @param {Number} caretPos
     */
    var setCursorPosition = function(el, caretPos) {
        if (el.createTextRange) {
            var range = el.createTextRange();
            range.move('character', caretPos);
            range.select();
        } else {
            if (el.selectionStart) {
                el.focus();
                el.setSelectionRange(caretPos, caretPos);
            } else {
                el.focus();
            }
        }
    }

    /*
    var savedRange;
    var _getSelection = function() {
        if (window.getSelection) {
            savedRange = window.getSelection().getRangeAt(0);
        } else if (document.selection) {
            savedRange = document,selection.createRange();
        }
    }

    var _setSelection = function() {
        if (savedRange) {
            console.log('restore');
            if (window.getSelection) {
                var s = window.getSelection();
                if (s.rangeCount > 0)
                    s.removeAllRanges();
                s.addRange(savedRange);
            } else if (document.createRange) {
                window.getSelection().addRange(savedRange);
            } else if (document.selection) {
                savedRange.select();
            }
        }
    }

    var placeCaretAtEnd = function(el) {
        if (typeof window.getSelection !== 'undefined'
           && typeof document.createRange !== 'undefined') {
            var range = document.createRange();
            range.selectNodeContents(el);
            range.collapse(false);

            var sel = window.getSelection();
            sel.removeAllRanges();
            sel.addRange(range);
        } else if (typeof document.body.createTextRange !== 'undefined') {
            var textRange = document.body.createTextRange();
            textRange.moveToElementText(el);
            textRange.collapse(false);
            textRange.select();
        }
    }
    */

    /**
     * 构造函数，主要函数。初始化功能
     */
    function At(options) {
        // 进入@模式
        var IN_AT_STATUS = 1;
        // 退出@模式
        var OUT_OF_AT = 2;
        // 普通输入模式
        var NORMAL_AT = 3;
        // 默认sug长度
        var SUG_LIST_LENGTH = 10;
        // 无结果下的最大预测数量
        var MAX_PREDICT_NUMS = 10;
        // 合并后的参数
        this.opt = extend({}, this.params, options);
        // 计时器
        this.sugDomtimer = null;
        this.checkTimer = null;
        // 推荐dom结构
        this.sugDom = null;
        // 历史值
        this.history = null;
        // 输入框状态
        this.status = NORMAL_AT;
        // 如果sug是异步的，使用该配置
        this.__cache = {};
        // 如果是线下数据
        this.sugContent = this.opt.data;
        // 最大的显示长度
        this.max_list = this.opt.max_list || 10;
        // 入口函数
        this.init = function() {
            this.createStyle();
            this.createDom();
            this.bindEv();
        }
        // 加载样式
        // TODO 把style标签中的样式全部挪到这里
        this.createStyle = function() {
            var css = [
                '.at_sug_con {min-width:100px;display:none;position:absolute;border:1px solid #ccc;background:#fff;z-index:100;font-size:13px;color:#666;}',
                '.at_sug_con ul, .at_sug_con li{margin:0;padding:0;list-style:none}',
                '.at_sug_con li{display:block;padding:3px 5px;cursor:pointer}',
                '.at_sug_con li.hover{background:#e5e5e5}'
            ].join('');

            createStyle(css);
        }
        // 构件DOM结构
        this.createDom = function() {
            // create sug dom
            var sug = document.createElement('div');
            sug.className = 'at_sug_con';
            
            var ul = document.createElement('ul');

            sug.appendChild(ul);

            this.sugDom = sug;
            //document.body.appendChild(sug);
            document.getElementById('at_sug_container').appendChild(sug);
            // contenteditable
            if (this.opt.node.nodeName.toUpperCase() === 'DIV' ) {
                this.opt.node.setAttribute('contenteditable', 'true');
            }
        }
        this.showSugDom = function() {
            var value = this.opt.node.value;
            var caretPos = getCursorPosition(this.opt.node);
            var subValue = value.slice(0, caretPos.end);
            var matches = subValue.match(/@([^@]*)$/);
            var preKey;
            var datas;

            //console.log(value, caretPos, subValue, matches);
            if (matches && matches.length) {
                // 输入空格则停止预测
                if (/\s+$/.test(matches[1])) {
                    this.hideSugDom();
                    return false;
                }
                preKey = trim(matches[1]);
                datas = this.getSugData(preKey);

                // 如果预测长度大于给定的阈值，则停止预测
                if (!datas.length && preKey.length > MAX_PREDICT_NUMS) {
                    this.hideSugDom();
                    return false;
                }

                // 有预测前缀
                if (preKey) {
                    this.updateSugDom(datas);
                // 只输入了@在等待预测
                } else {
                    // TODO 此处可用于top query
                    datas = this.sugContent.length > this.max_list ? this.sugContent.slice(0, this.max_list) : this.sugContent;
                    this.updateSugDom(datas);
                }
            } else {
                this.hideSugDom();
            }
        }
        this.updateSugDom = function(data) {
            var tpl = '<li>#{0}</li>';
            var html = "";
            if (data && data.length) {
                for (var i = 0, len = data.length; i < len; i++) {
                    html += this.format(tpl, data[i]);
                }
            } else {
                // 如果在预测状态，但是没有预测结果的情况下；给出相应提示
                if (this.status == IN_AT_STATUS) {
                    html += this.format(tpl, "按空格直接输入");
                } else {
                    // 否则不响应任何信息；此处用于blur之后再点击鼠标聚焦后的预测情况
                    return;
                }
            }

            this.sugDom.getElementsByTagName('ul')[0].innerHTML = html;

            this.setSugDomPosition();

            this.sugDom.style.display = 'block';
            this.status = IN_AT_STATUS;
        }
        this.getSugData = function(prefix) {
            // 是异步接口
            if (typeof this.sugContent === 'string') {
                // 如果在cache中则直接返回
                if (this.getCacheData(prefix)) return this.getCacheData(prefix);
                // TODO 异步接口
                // 注意：该接口未经过测试！！！
                // 目前已知的问题：第一次不会触发sug；因为接下来的内容只cache了数据而没有返回
                this.opt.getSugData && this.opt.getCacheData(prefix, this.setCacheData);
            } else if (oproto.call(this.sugContent) === "[object Array]") {
            // 目前只支持数组类型的数据
                // 模糊匹配
                // 可配置的精确前缀匹配
                var _sugs = [];
                for (var i = 0, len = this.sugContent.length; i < len; i++) {
                    if (this.sugContent[i].indexOf(prefix) !== -1) {
                        _sugs.push(this.sugContent[i]);
                    }
                }
            }
            _sugs.length = Math.min(_sugs.length, this.max_list);

            return _sugs;
        }
        this.setCacheData = function(prefix, data) {
            try {
                if (typeof data === 'string') {
                    data = JSON.parse(data);
                }
            } catch(e) {}
            this.__cache[prefix] = data;
        }
        this.getCacheData = function(prefix) {
            return this.__cache[prefix];
        }
        this.hideSugDom = function() {
            this.status = OUT_OF_AT;
            this.sugDom.style.display = 'none';

            //window.clearTimeout(this.checkTimer);
            //this.checkTimer = null;
        }
        this.getCss = function(attr) {
            var style, value;
            var e = this.opt.node;
            if (window.getComputedStyle) {
                style = window.getComputedStyle(e, null);
                value = style.getPropertyValue(attr);
                return value;
            } else if (e.currentStyle) {
                return e.currentStyle[normalize(attr)];
            }

            return e.style[normalize(attr)];

            // 将line-height这种形式的属性替换成lineHeight这种形式
            function normalize(str) {
                var parts = str.split('-');
                for (var i = 0, len = parts.length; i < len; i++) {
                    var tmp = parts[i].split('');
                    if (i) {
                        tmp.splice(0, 1, tmp[0].toUpperCase());
                        parts[i] = tmp.join('');
                    }
                }

                return parts.join('');
            }
        }

        // 得到光标位置在textarea节点中的偏移量
        this.getCursorOffset = function() {
            var value = this.opt.node.value;
            var style = this.opt.node.style;
            var origin_left = getOffsetLeft(this.opt.node);
            var origin_top = getOffsetTop(this.opt.node);
            var caretPos = getCursorPosition(this.opt.node);
            var lines = value.slice(0, caretPos.end).split('\n');
            var len = lines.length;

            // 辅助计算的dom节点
            if (!this.__helper) {
                var div = document.createElement('div');
                div.id = "__at_position_helper";
                div.style.position = "fixed";
                div.style.left = "-99999px";
                div.style.zIndex = "-1";
                div.style.fontSize = this.getCss('font-size');
                div.style.paddingLeft = this.getCss('padding-left');
                div.style.paddingRight = this.getCss('padding-right');
                this.__helper = div;
                document.body.appendChild(div);
            }

            // 填充数据计算占用的宽度
            // 使用最后一行数据来校验即可
            this.__helper.innerText = lines[len - 1];
            var width = this.__helper.offsetWidth - parseInt(this.getCss('font-size'));

            // 计算在输入框中的高度
            var lineHeight = this.getCss('line-height');
            var fixPadding = this.getCss('padding-top');
            var fixScroll = this.opt.node.scrollTop;
            var height = len * (parseInt(lineHeight)) + parseInt(fixPadding);
            height -= fixScroll;

            return {
                left: width + origin_left,
                top: height + origin_top
            };
        }
        this.setSugDomPosition = function(pos) {
            var offset = this.getCursorOffset();
            this.sugDom.style.left = offset.left + 'px';
            this.sugDom.style.top = offset.top + 'px';
        }
        this.bindEv = function() {
            var self = this;
            /*
            addEvent(this.opt.node, 'focus', function() {
                self.checkTimer = setTimeout(function() {
                    self.showSugDom();
                    self.checkTimer = setTimeout(arguments.callee, 50);
                }, 50);
            });
            */

            // TODO 考虑使用计时器监听的方式实现，效率更高！
            addEvent(this.opt.node, 'keyup', function(e) {
                // 如果在预测状态下按了空格则退出预测状态，恢复到正常模式
                /*
                if (e.keyCode == 32 && self.status == IN_AT_STATUS) {
                    self.status = OUT_OF_AT;
                    self.hideSugDom();
                    return;
                }
                */
                // 基本能确定是按了@键
                if (self.status == IN_AT_STATUS || (e.keyCode == 50 && e.shiftKey)) {
                    self.status = IN_AT_STATUS;
                    self.showSugDom();
                }

                // TODO 考虑支持使用键盘方向键选择sug值
                //console.log(getCursorPosition(this));
                /*
                console.log(e.keyCode);
                if (self.status == IN_AT_STATUS && self.sugDom.style.display !== 'none') {
                    var caretPos = getCursorPosition(this);
                    console.log(caretPos);
                    // up
                    if (e.keyCode == 38) {
                        e.preventDefault();
                        e.cancelBubble = true;

                        setCursorPosition(this, caretPos.end);
                        return false;
                    // down
                    } else if (e.keyCode == 40) {
                        e.preventDefault();
                        e.cancelBubble = true;

                        setCursorPosition(this, caretPos.end);
                        return false;
                    }
                }
                */

                //self.showSugDom();
            });

            addEvent(this.opt.node, 'data_insert', function(e) {
                var data = e.data;
                var caretPos = getCursorPosition(this);
                console.log(caretPos);

                var _pre = this.value.substr(0, caretPos.start);
                var _last = this.value.substr(caretPos.start);

                var atPos = _pre.lastIndexOf('@');
                _pre = _pre.substr(0, atPos + 1) + data + ' ';

                this.value = _pre + _last;

                setCursorPosition(this, _pre.length);
            });

            addEvent(this.sugDom, 'click', function(e) {
                self.opt.node.focus();
                var target = e.srcElement ? e.srcElement : e.target;

                if (target.nodeName.toLowerCase() === 'li') {
                    triggerEvent(self.opt.node, 'data_insert', target.innerText);
                }

                window.clearTimeout(self.sugDomtimer);
                self.sugDomtimer = null;

                // 数据选择后可以影藏sugDom了
                self.hideSugDom();
            });

            addEvent(this.opt.node, 'mouseup', function(e) {
                self.showSugDom();
            });

            addEvent(this.sugDom, 'mouseover', function(e) {
                var target = e.srcElement ? e.srcElement : e.target;
                if (target.nodeName.toLowerCase() === 'li') {
                    if (target.className !== 'hover') {
                        target.className = 'hover';
                    }
                }
            });

            // should mouseout other than mouseleave
            addEvent(this.sugDom, 'mouseout', function(e) {
                var target = e.srcElement ? e.srcElement : e.target;
                if (target.nodeName.toLowerCase() === 'li') {
                    target.className = '';
                }
            });

            addEvent(this.opt.node, 'blur', function() {
                // 太特么机智了！！！
                // 彻底解决了点击sugDom就触发blur而不触发sugDom上click事件的问题
                self.sugDomtimer = setTimeout(function() {
                    self.hideSugDom();
                }, 200);
            });
        }

        this.init();
    }

    At.prototype = {
        constructor: At,
        params: {
            node: null,
            // 预测的最大显示长度
            max_list: 10,
            enableCopy: false,
            // 为sug提供的数据源
            // 可直接提供一个url，sug异步获取内容
            data: [],
            /*
            // 如果需要异步获取sug数据，则自行提供一个函数；预留一个调用回调函数的接口
            getSugData: function(prefix, cb) {
                var ajax = new Ajax({
                    url: '',
                    method: 'get',
                    data: {},
                    success: function(msg) {
                        cb(prefix, msg);
                    }
                });
            }
            */
            getSugData: null
        },
        format: function(tpl) {
            var args = [].slice.call(arguments, 1); 
            return tpl.replace(/#\{(\d+)\}/g, function() {
                return args[arguments[1]] || ""; 
            }); 
        }
    }


    // commonJS
    if (typeof module === "object" && module && typeof module.exports === "object") {
        module.exports = At;
    } else {
        window.At = At;

        if (typeof define === 'function' && define.amd) {
            define('at', [], function() { return At; });
        }
    }

})(this);

// useage
/*
var node = document.getElementById('test');
new At({node: node, data: ['a', 'b', 'c']});
*/

// TODO LIST
// 自动位置适应
