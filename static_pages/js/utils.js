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
    }
};

const utils = 
{
    MAIN_COIN: 'Marycoin',
    DEFAULT_PAIR: 'Litecoin',
    COMISSION: 0.001,
    ValidateEmail: function(text)
    {
        if (!text || !text.length)
            return false;
            
        const mailformat = /^[-a-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-a-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?\.)*(?:aero|arpa|asia|biz|cat|com|coop|club|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|pro|tel|travel|[a-z][a-z])$/;
        return text.match(mailformat);
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
        socket = new WebSocket("wss://"+window.location.host+ ":40443");
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
    }

}


const modals = {
    OKCancel0 : function(title, body, callback)
    {
        $('.modal-footer').hide();
        modals.show(title, body, '', '', callback);
    },
    OKCancel1 : function(title, body, callback)
    {
        $('.modal-footer').show();
        $('#id_modal_cancel').hide();
        modals.show(title, body, 'OK', '', callback);
    },
    OKCancel : function(title, body, callback)
    {
        $('.modal-footer').show();
        $('#id_modal_cancel').show();
        modals.show(title, body, 'Confirm', 'Cancel', callback);
    },
    show : function(title, body, ok, cancel, callback)
    {
        const cb = callback || function(){};
        $('#myModalLabel').text(title);
        $('.modal-body').html(''); $('.modal-body').append($(body));
        
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

