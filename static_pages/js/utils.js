'use strict';

var socket = '';//new WebSocket("wss://"+window.location.host+ ":40443");

const utils = 
{
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
        //console.log('setItem key='+key+'; value='+JSON.stringify(value));
        var oldValue = this.getItem(key);
        
        oldValue.status = 'success';
        oldValue.value = value;
        
        var stor;
        if (window.content != undefined)
            stor = window.content.localStorage;
        else
            stor = localStorage;
    
        //storage.clear();
    	stor.setItem(key, JSON.stringify(oldValue));
    }
};
