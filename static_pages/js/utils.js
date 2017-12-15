'use strict';

var socket = '';//new WebSocket("wss://"+window.location.host+ ":40443");

const utils = 
{
    ValidateEmail: function(text)
    {
        if (!text || !text.length)
            return false;
            
        const mailformat = /^[-a-z0-9!#$%&'*+/=?^_`{|}~]+(?:\.[-a-z0-9!#$%&'*+/=?^_`{|}~]+)*@(?:[a-z0-9]([-a-z0-9]{0,61}[a-z0-9])?\.)*(?:aero|arpa|asia|biz|cat|com|coop|edu|gov|info|int|jobs|mil|mobi|museum|name|net|org|pro|tel|travel|[a-z][a-z])$/;
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
    }
}
