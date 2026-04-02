/**
 * Настройки: URL бэкенда (поле manifest), API-ключ и ID канала MAX (edna Pulse), подключение.
 */
define(['jquery'], function ($) {
  'use strict';

  return function () {
    var self = this;

    function trimSlash(url) {
      return (url || '').replace(/\/+$/, '');
    }

    function getAccountId() {
      try {
        if (typeof AMOCRM !== 'undefined' && AMOCRM.constant) {
          var acc = AMOCRM.constant('account');
          if (acc && acc.id != null) {
            return String(acc.id);
          }
        }
      } catch (e) {
        /* ignore */
      }
      return null;
    }

    function getBackendUrl() {
      if (!self.get_settings) {
        return '';
      }
      var s = self.get_settings();
      if (!s) {
        return '';
      }
      if (s.backend_url) {
        return String(s.backend_url).trim();
      }
      if (s.fields && s.fields.backend_url) {
        return String(s.fields.backend_url).trim();
      }
      return '';
    }

    function renderPulseForm($root) {
      if (!$root || !$root.length || $root.find('.edna-max-pulse-block').length) {
        return;
      }
      var lang = (self.params && self.params.lang) || 'ru';
      var isRu = String(lang).indexOf('ru') === 0;

      var L = {
        heading: isRu ? 'Канал MAX (edna Pulse)' : 'MAX channel (edna Pulse)',
        apiKey: isRu ? 'API-ключ' : 'API key',
        channelId: isRu ? 'ID канала' : 'Channel ID',
        connect: isRu ? 'Подключить канал' : 'Connect channel',
        needBackend: isRu
          ? 'Укажите URL бэкенда в настройках выше и сохраните виджет.'
          : 'Set backend URL in settings above and save the widget.',
        needOAuth: isRu
          ? 'Аккаунт не привязан к бэкенду. Сначала установите интеграцию (OAuth).'
          : 'Account is not linked to the backend. Complete integration (OAuth) first.',
        fillFields: isRu
          ? 'Введите API-ключ и ID канала.'
          : 'Enter API key and channel ID.',
        success: isRu ? 'Канал подключён. scope_id: ' : 'Connected. scope_id: ',
        error: isRu ? 'Ошибка: ' : 'Error: ',
        network: isRu
          ? 'Не удалось обратиться к серверу.'
          : 'Could not reach the server.',
      };

      var html =
        '<div class="edna-max-pulse-block" style="margin-top:16px;padding-top:16px;border-top:1px solid #e6e6e6">' +
        '<div style="font-weight:600;margin-bottom:12px">' +
        L.heading +
        '</div>' +
        '<div class="edna-max-field" style="margin-bottom:12px">' +
        '<label style="display:block;margin-bottom:4px">' +
        L.apiKey +
        '</label>' +
        '<input type="password" class="edna-max-api-key" style="width:100%;max-width:420px" autocomplete="off" />' +
        '</div>' +
        '<div class="edna-max-field" style="margin-bottom:12px">' +
        '<label style="display:block;margin-bottom:4px">' +
        L.channelId +
        '</label>' +
        '<input type="text" class="edna-max-channel-id" style="width:100%;max-width:420px" autocomplete="off" />' +
        '</div>' +
        '<button type="button" class="button-input edna-max-connect">' +
        L.connect +
        '</button>' +
        '<div class="edna-max-msg" style="margin-top:12px;font-size:13px"></div>' +
        '</div>';

      var $block = $(html);
      $root.append($block);

      $block.on('click', '.edna-max-connect', function () {
        var $msg = $block.find('.edna-max-msg');
        $msg.text('').css('color', '');

        var backend = trimSlash(getBackendUrl());
        if (!backend) {
          $msg.css('color', '#c00').text(L.needBackend);
          return;
        }

        var accountId = getAccountId();
        if (!accountId) {
          $msg.css('color', '#c00').text(L.needOAuth);
          return;
        }

        var apiKey = $block.find('.edna-max-api-key').val();
        var channelId = $block.find('.edna-max-channel-id').val();
        if (!apiKey || !String(apiKey).trim() || !channelId || !String(channelId).trim()) {
          $msg.css('color', '#c00').text(L.fillFields);
          return;
        }

        var $btn = $block.find('.edna-max-connect').prop('disabled', true);

        $.ajax({
          url:
            backend +
            '/api/widget/bootstrap?amocrm_account_id=' +
            encodeURIComponent(accountId),
          method: 'GET',
          dataType: 'json',
          timeout: 30000,
        })
          .done(function (boot) {
            if (!boot || !boot.installation || !boot.installation.installation_id) {
              $msg.css('color', '#c00').text(L.needOAuth);
              $btn.prop('disabled', false);
              return;
            }

            $.ajax({
              url: backend + '/api/channel-connections',
              method: 'POST',
              contentType: 'application/json',
              dataType: 'json',
              data: JSON.stringify({
                installation_id: boot.installation.installation_id,
                display_name: isRu
                  ? 'Канал MAX (edna Pulse)'
                  : 'MAX channel (edna Pulse)',
                api_key: String(apiKey).trim(),
                channel_id: String(channelId).trim(),
              }),
              timeout: 120000,
            })
              .done(function (res) {
                $msg
                  .css('color', '#1a7f37')
                  .text(L.success + (res && res.scope_id ? res.scope_id : ''));
              })
              .fail(function (xhr) {
                var err = L.error;
                try {
                  var j = xhr.responseJSON;
                  if (j) {
                    if (typeof j.message === 'string') {
                      err += j.message;
                    } else if (Array.isArray(j.message)) {
                      err += j.message.join('; ');
                    } else if (j.error) {
                      err +=
                        typeof j.error === 'string'
                          ? j.error
                          : JSON.stringify(j.error);
                    } else {
                      err += xhr.status || '';
                    }
                  } else {
                    err += xhr.responseText || xhr.status || '';
                  }
                } catch (e) {
                  err += xhr.status || '';
                }
                $msg.css('color', '#c00').text(err);
              })
              .always(function () {
                $btn.prop('disabled', false);
              });
          })
          .fail(function () {
            $msg.css('color', '#c00').text(L.network);
            $btn.prop('disabled', false);
          });
      });
    }

    this.callbacks = {
      init: function () {
        return true;
      },
      render: function () {
        return true;
      },
      bind_actions: function () {
        return true;
      },
      settings: function ($modal_body) {
        var $area =
          $modal_body && $modal_body.length
            ? $modal_body
            : $('.widget-settings__body');
        renderPulseForm($area);
        return true;
      },
      onSave: function () {
        return true;
      },
      destroy: function () {},
    };

    return this;
  };
});
