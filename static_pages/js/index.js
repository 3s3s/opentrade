'use strict';

$(() => {
  utils.CreateSocket(onSocketMessage, onOpenSocket);

  $('#button_chat').click(event => {
        event.preventDefault();
        SendChatMessage();
  });

});

function SendChatMessage()
{
  socket.send(JSON.stringify({request: 'postchat', message: {text: $('#chat_message').val()}}));
  $('#chat_message').val('');
}

function onOpenSocket()
{
  socket.send(JSON.stringify({request: 'getchat'}));
}

function onSocketMessage(event)
{
  var data = {};
  try { data = JSON.parse(event.data); }
  catch(e) {return;}
  
  if (!data.request || data.request == 'error' || !data.message)
    return;
    
  if (data.request == 'chat-message')
  {
    AddChatMessage(data.message)
    return;
  }
  if (data.request == 'chat-messages')
  {
    $('#chat-container').empty();
    for (var i=0; i<data.message.length; i++)
      AddChatMessage(data.message[i])
    return;
  }
}

function AddChatMessage(message)
{
  const user = $('<a href="#"></a>').text(message.user+":");
  const text = $('<span class="p-2"></span>').text(message.message.text);
  $('#chat-container').append($('<div class="row"></div>').append($('<div class="col-md-12"></div>').append(user).append(text)))
}

