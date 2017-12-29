'use strict';

var socket = '';

const utils = 
{
    MAIN_COIN: 'Marycoin',
    DEFAULT_PAIR: 'Litecoin',
    COMISSION: 0.01,
    ValidateEmail: function(text)
    {
        if (!text || !text.length)
            return false;
            
        const mailformat = /^[-a-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-a-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?\.)*(?:aero|arpa|asia|biz|cat|com|coop|club|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|pro|tel|travel|[a-z][a-z])$/;
        return text.match(mailformat);
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
    timeConverter : function (UNIX_timestamp){
      var a = new Date(UNIX_timestamp);
      var months = ['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec'];
      var year = a.getFullYear();
      var month = months[a.getMonth()];
      var date = a.getDate();
      var hour = a.getHours();
      var min = a.getMinutes();
      var sec = a.getSeconds();
      var time = date + ' ' + month + ' ' + year + ' ' + hour + ':' + min + ':' + sec ;
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
    }
}


const modals = {
    OKCancel : function(title, body, callback)
    {
        modals.show(title, body, 'Confirm', 'Cancel', callback);
    },
    show : function(title, body, ok, cancel, callback)
    {
        const cb = callback || function(){};
        $('#myModalLabel').text(title);
        $('.modal-body').html(''); $('.modal-body').append($(body));
        
        $('#id_modal_cancel').html(cancel);
        $('#id_modal_ok').html(ok);
        
        $('#id_modal_cancel').off('click');
        $('#id_modal_ok').off('click');
        
        $('#id_modal_cancel').on('click', e => {cb('cancel');})
        $('#id_modal_ok').on('click', e => {$('#myModal').modal('hide'); cb('ok');})
        
        $('#myModal').modal('show');
    }
}

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
