(function(win) {
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
        if (e.offsetParent != null) offset += getOffsetLeft(e.offsetParent);

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
        this.opt = this.extend({}, this.params, options);
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
                '#at_sug_main{}'
            ].join('');
        }
        // 构件DOM结构
        this.createDom = function() {
            // create sug dom
            var sug = document.createElement('div');
            sug.id = 'at_sug_main';
            
            var ul = document.createElement('ul');
            ul.id = "at_sug_list";

            sug.appendChild(ul);

            this.sugDom = sug;
            document.body.appendChild(sug);
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
                    this.updateSugDom(this.sugContent);
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
                html += this.format(tpl, "按空格直接输入");
            }

            document.getElementById('at_sug_list').innerHTML = html;
            var offset = this.getCursorOffset();
            this.sugDom.style.left = offset.left + 'px';
            this.sugDom.style.top = offset.top + 'px';
            this.sugDom.style.display = 'block';
            this.status = IN_AT_STATUS;
        }
        this.getSugData = function(prefix) {
            // 是异步接口
            if (typeof this.sugContent === 'string') {
                // 如果在cache中则直接返回
                if (this.__cache[prefix]) return this.__cache[prefix];
                // TODO 异步接口
            } else if (this.oproto.call(this.sugContent) === "[object Array]") {
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

            return _sugs;
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
                this.value = this.value + data + ' ';

                setCursorPosition(this, this.value.length);
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
            enableCopy: false,
            // 为sug提供的数据源
            // 可直接提供一个url，sug异步获取内容
            data: []
        },
        extend: function() {
            var target = this.isObject(arguments[0]) ? arguments[0] : {};
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
        },
        oproto: Object.prototype.toString,
        isObject: function(o) {
            return this.oproto.call(o) === "[object Object]";
        },
        isArray: function(o) {
            return this.oproto.call(o) === "[object Array]";
        },
        format: function(tpl) {
            var args = [].slice.call(arguments, 1); 
            return tpl.replace(/#\{(\d+)\}/g, function() {
                return args[arguments[1]] || ""; 
            }); 
        }
    }

    // FOR TEST
    if (true) {
        win.At = At;
        //win.placeCaretAtEnd = placeCaretAtEnd;
        win.getCursorPosition = getCursorPosition;
        win.setCursorPosition = setCursorPosition;
        win.trim = trim;
        win.addEvent = addEvent;
        win.triggerEvent = triggerEvent;
    }
})(this);

// useage
/*
var node = document.getElementById('test');
new At({node: node, data: ['a', 'b', 'c']});
*/
