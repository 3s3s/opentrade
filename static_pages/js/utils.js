'use strict';

var socket = '';

const storage = {
    deleteKey : function(parent, key) {
        var jsonSaved =this.getItem(parent).value || {}; 
    
        if (jsonSaved[key] == undefined)
            return;
            
        delete jsonSaved[key];
    
        this.setItem(parent, jsonSaved);
    },
    getItem : function(key) {
        var stor;
        if (window.content != undefined)
            stor = window.content.localStorage;
        else
            stor = localStorage;
    
        var str = stor.getItem(key);
        if (str == undefined)
            return null;
        
        try {
            return JSON.parse(str);
        }
        catch(e) {
            return null;
        }
    },
    setItem : function(key, value) {
        var oldValue = this.getItem(key);
        
        if (oldValue == null)
            oldValue = {};
       
        oldValue['status'] = 'success';
        oldValue['value'] = value;
        
        var stor;
        if (window.content != undefined)
            stor = window.content.localStorage;
        else
            stor = localStorage;
    
        //storage.clear();
    	stor.setItem(key, JSON.stringify(oldValue));
    },
    deleteKeyS : function(parent, key) {
        var jsonSaved =this.getItemS(parent).value || {}; 
    
        if (jsonSaved[key] == undefined)
            return;
            
        delete jsonSaved[key];
    
        this.setItemS(parent, jsonSaved);
    },
    getItemS : function(key) {
        var stor;
        if (window.content != undefined)
            stor = window.content.sessionStorage;
        else
            stor = sessionStorage;
    
        var str = stor.getItem(key);
        if (str == undefined)
            return null;
        
        try {
            return JSON.parse(str);
        }
        catch(e) {
            return null;
        }
    },
    setItemS : function(key, value) {
        var oldValue = this.getItemS(key);
        
        if (oldValue == null)
            oldValue = {};
       
        oldValue['status'] = 'success';
        oldValue['value'] = value;
        
        var stor;
        if (window.content != undefined)
            stor = window.content.sessionStorage;
        else
            stor = sessionStorage;
    
        //storage.clear();
    	stor.setItem(key, JSON.stringify(oldValue));
    }
};

const utils = 
{
    MAIN_COIN: MAIN_COIN,
    DEFAULT_PAIR: DEFAULT_PAIR,
    COMISSION: TRADE_COMISSION,
    
    OPENTRADE: "OpenTrade",
    USD_NAME: "US Dollar",
    USD_TICKER: "USD",
    RUB_NAME: "Ruble",
    RUB_TICKER: "RUB",
    
    IsFiat: function(coin)
    {
        if (coin == utils.USD_NAME) return true;
        if (coin == utils.RUB_NAME) return true;
        if (coin == utils.USD_TICKER) return true;
        if (coin == utils.RUB_TICKER) return true;
        
        return false;
    },
    
    ValidateEmail: function(text)
    {
        if (!text || !text.length)
            return false;
            
        const mailformat = /^[-a-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-a-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?\.)*(?:aero|arpa|asia|biz|cat|com|coop|club|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|pro|tel|travel|[a-z][a-z])$/;
        return text.match(mailformat);
    },
    isNumeric: function(n)
    {
        return !isNaN(parseFloat(n)) && isFinite(n);
    },
    MakePrice2: function(str)
    {
        const roundFull = (3-Math.log10(str*1)).toFixed(0)*1;
        const round = roundFull < 0 ? 0 : (roundFull > 8) ? 8 : roundFull;
        return (utils.MakePrice(str)*1).toFixed(round)*1;
    },
    MakePrice: function(str)
    {
        if (!utils.isNumeric(str))
            return 0.0;
        
        if ((str*1.0).toFixed(8)*1.0 == str*1.0)
            return str*1.0;
        
        const str0 = str.toString();
        const ret = str0.substring(0, str0.indexOf(".") + 8);
        
        if ((ret*1.0).toString().length < ret.length)
            return ret*1.0;
        return ret;
    },
    GetCurrentLang: function()
    {
      const currentLang = storage.getItem('CurrentLang');
      if (currentLang != null && currentLang.value && currentLang.value.length)
        return currentLang.value;

        storage.setItem('CurrentLang', $('#id_lang').val());
        return $('#id_lang').val();
    },
    CreateSocket: function(onmessage, onopen)
    {
        socket = new WebSocket("wss://"+window.location.hostname+":"+PORT_SSL);
//        socket = new WebSocket("wss://"+window.location.hostname);
        socket.onmessage = onmessage;
        socket.onopen = onopen;
        
        socket.onclose = function(event) {
          if (event.wasClean) {
            //alert('Соединение закрыто чисто');
          } else {
            //alert('Обрыв соединения'); // например, "убит" процесс сервера
          }
          //alert('Код: ' + event.code + ' причина: ' + event.reason);
          setTimeout(utils.CreateSocket, 10000, onmessage, onopen);
        };
        
        socket.onerror = function(error) {
          //alert("Ошибка " + error.message);
          //setTimeout(utils.CreateSocket, 10000);
        };
    },
    timeConverter : function (UNIX_timestamp, hideSeconds){
      var a = new Date(UNIX_timestamp);
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var year = a.getFullYear();
      var month = months[a.getMonth()];
      var date = a.getDate();
      var hour = a.getHours();
      var min = a.getMinutes();
      var sec = a.getSeconds();
      var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;

      if (hideSeconds) 
        time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min;
      return time;
    },
    alert_fail: function(message) {
        $('#fail-message').html(message);
        $('#alert-fail').show()
        $("#close_fail").on("click", function(e) 
        {  
            e.preventDefault();
            $("#alert-fail").hide();
        });
    },
    alert_success: function(message) {
        $('#success-message').html(message);
        $('#alert-success').show()
        $("#close_success").on("click", function(e) 
        {   
            e.preventDefault();
            $("#alert-success").hide();
        });
    },
    checkInView: function(container, element, partial) {
    
        //Get container properties
        let cTop = container.scrollTop;
        let cBottom = cTop + container.clientHeight;
    
        //Get element properties
        let eTop = element.offsetTop;
        let eBottom = eTop + element.clientHeight;
    
        //Check if in view    
        let isTotal = (eTop >= cTop && eBottom <= cBottom);
        let isPartial = partial && (
          (eTop < cTop && eBottom > cTop) ||
          (eBottom > cBottom && eTop < cBottom)
        );
    
        //Return outcome
        return  (isTotal  || isPartial);
    },
    
    setCookie: function(name, value, options) {
      options = options || {};
    
      var expires = options.expires;
    
      if (typeof expires == "number" && expires) {
        var d = new Date();
        d.setTime(d.getTime() + expires * 1000);
        expires = options.expires = d;
      }
      if (expires && expires.toUTCString) {
        options.expires = expires.toUTCString();
      }
    
      value = encodeURIComponent(value);
    
      var updatedCookie = name + "=" + value;
    
      for (var propName in options) {
        updatedCookie += "; " + propName;
        var propValue = options[propName];
        if (propValue !== true) {
          updatedCookie += "=" + propValue;
        }
      }
    
      document.cookie = updatedCookie;
    },
    
    ChangeUrl: function(title, url) {
        if (typeof (history.pushState) != "undefined") {
            var obj = { Title: title, Url: url };
            history.pushState(obj, obj.Title, obj.Url);
        } else {
            //alert("Browser does not support HTML5.");
    }
}

//    copyTextToClipboard: function(text, callback) {
//      var textArea = document.createElement("textarea");
    
      //
      // *** This styling is an extra step which is likely not required. ***
      //
      // Why is it here? To ensure:
      // 1. the element is able to have focus and selection.
      // 2. if element was to flash render it has minimal visual impact.
      // 3. less flakyness with selection and copying which **might** occur if
      //    the textarea element is not visible.
      //
      // The likelihood is the element won't even render, not even a flash,
      // so some of these are just precautions. However in IE the element
      // is visible whilst the popup box asking the user for permission for
      // the web page to copy to the clipboard.
      //
    
      // Place in top-left corner of screen regardless of scroll position.
/*      textArea.style.position = 'fixed';
      textArea.style.top = 0;
      textArea.style.left = 0;
    
      // Ensure it has a small width and height. Setting to 1px / 1em
      // doesn't work as this gives a negative w/h on some browsers.
      textArea.style.width = '2em';
      textArea.style.height = '2em';
    
      // We don't need padding, reducing the size if it does flash render.
      textArea.style.padding = 0;
    
      // Clean up any borders.
      textArea.style.border = 'none';
      textArea.style.outline = 'none';
      textArea.style.boxShadow = 'none';
    
      // Avoid flash of white box if rendered for any reason.
      textArea.style.background = 'transparent';
    
    
      textArea.value = text;
    
      document.body.appendChild(textArea);
      textArea.focus();
      textArea.select();
      
      try {
        var successful = document.execCommand('copy');
        var msg = successful ? 'successful' : 'unsuccessful';
        console.log('Copying text command was ' + msg);
        setTimeout(callback, 1, true)
      } catch (err) {
        console.log('Oops, unable to copy');
        setTimeout(callback, 1, false)
      }
    
      document.body.removeChild(textArea);
    }*/



}


const modals = {
    OKCancel0 : function(title, body, callback)
    {
        $('.modal-footer').hide();
        modals.show(title, body, '', '', callback);
    },
    OKCancel1 : function(title, body, callback, bodyIsObject)
    {
        $('.modal-footer').show();
        $('#id_modal_cancel').hide();
        modals.show(title, body, 'OK', '', callback, bodyIsObject);
    },
    OKCancel : function(title, body, callback)
    {
        $('.modal-footer').show();
        $('#id_modal_cancel').show();
        modals.show(title, body, 'Confirm', 'Cancel', callback);
    },
    show : function(title, body, ok, cancel, callback, bodyIsObject)
    {
        const cb = callback || function(){};
        $('#myModalLabel').text(title);
        
        $('.modal-body').html('');
        if (bodyIsObject == undefined)
            $('.modal-body').append($(body));
        else
            $('.modal-body').append(body);

        if (cancel.length)
        {
            $('#id_modal_cancel').html(cancel);
            $('#id_modal_cancel').off('click');
            $('#id_modal_cancel').on('click', e => {cb('cancel');})
        }
        if (ok.length)
        {
            $('#id_modal_ok').html(ok);
            $('#id_modal_ok').off('click');
            $('#id_modal_ok').on('click', e => {$('#myModal').modal('hide'); cb('ok');})
        }
        
        $('#myModal').modal('show');
    }
}

