define(['jquery'], function ($) {
  'use strict';

  return function () {
    var self = this;

    function trimSlash(url) {
      return String(url || '').replace(/\/+$/, '');
    }

    function tr(path, fallback) {
      var parts = path.split('.');
      var node = self.langs || {};
      for (var i = 0; i < parts.length; i += 1) {
        if (!node || typeof node !== 'object' || !(parts[i] in node)) {
          return fallback;
        }
        node = node[parts[i]];
      }
      return typeof node === 'string' ? node : fallback;
    }

    function getSettingsDict() {
      if (!self.get_settings) {
        return {};
      }
      return self.get_settings() || {};
    }

    /** Текущие значения из SDK (уже сохранённые) + fallback fields */
    function readSaved(key) {
      var s = getSettingsDict();
      if (s[key] != null && String(s[key]) !== '') {
        return String(s[key]).trim();
      }
      if (s.fields && s.fields[key] != null) {
        return String(s.fields[key]).trim();
      }
      return '';
    }

    /**
     * Значения из формы настроек (в т.ч. ещё не сохранённые).
     * amoCRM может генерировать разные имена полей — перебираем варианты.
     */
    function readFromSettingsForm(key) {
      var $roots = $('.widget-settings__body');
      if (!$roots.length) {
        $roots = $('.widget_settings_block');
      }
      if (!$roots.length) {
        $roots = $(document);
      }
      var selectors = [
        'input[name="' + key + '"]',
        'textarea[name="' + key + '"]',
        '[name="' + key + '"]',
      ];
      for (var r = 0; r < $roots.length; r += 1) {
        var $root = $($roots[r]);
        for (var i = 0; i < selectors.length; i += 1) {
          var $el = $root.find(selectors[i]);
          if ($el.length) {
            var v = $el.filter('input, textarea').first().val();
            if (v != null && String(v) !== '') {
              return String(v).trim();
            }
          }
        }
      }
      return '';
    }

    function readField(key) {
      var fromDom = readFromSettingsForm(key);
      if (fromDom) {
        return fromDom;
      }
      return readSaved(key);
    }

    function isRuLocale() {
      var lang = (self.params && self.params.lang) || '';
      return String(lang).toLowerCase().indexOf('ru') === 0;
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

    function appendConnectUi($area) {
      if ($area.find('.edna-pulse-connect-wrap').length) {
        return;
      }
      var connectLabel = tr('pulse.connect', 'Connect channel');
      var html =
        '<div class="edna-pulse-connect-wrap" style="margin-top:20px;padding-top:16px;border-top:1px solid #e6e6e6">' +
        '<button type="button" class="button-input edna-pulse-connect">' +
        connectLabel +
        '</button>' +
        '<div class="edna-pulse-msg" style="margin-top:12px;font-size:13px"></div>' +
        '</div>';
      $area.append(html);
    }

    function bindConnectHandler($area) {
      $area.off('click.ednaPulse');
      $area.on('click.ednaPulse', '.edna-pulse-connect', function () {
        var ru = isRuLocale();
        var $msg = $area.find('.edna-pulse-msg');
        $msg.text('').css('color', '');

        var backend = trimSlash(readField('backend_url'));
        if (!backend) {
          $msg
            .css('color', '#c00')
            .text(tr('pulse.need_backend', ru ? 'Укажите Backend URL.' : 'Set Backend URL.'));
          return;
        }

        var apiKey = readField('api_key');
        var channelId = readField('channel_id');
        if (!apiKey || !channelId) {
          $msg
            .css('color', '#c00')
            .text(tr('pulse.fill_credentials', ru ? 'Введите API-ключ и ID канала.' : 'Enter API key and channel ID.'));
          return;
        }

        var accountId = getAccountId();
        if (!accountId) {
          $msg
            .css('color', '#c00')
            .text(tr('pulse.need_account', ru ? 'Не удалось определить аккаунт amoCRM.' : 'Could not detect amoCRM account.'));
          return;
        }

        var $btn = $area.find('.edna-pulse-connect').prop('disabled', true);

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
              $msg
                .css('color', '#c00')
                .text(
                  tr(
                    'pulse.need_installation',
                    ru
                      ? 'Установка не найдена. Сначала пройдите OAuth интеграции.'
                      : 'Installation not found. Complete OAuth first.',
                  ),
                );
              $btn.prop('disabled', false);
              return;
            }

            var displayName = tr(
              'pulse.display_name',
              ru ? 'Канал MAX (edna Pulse)' : 'MAX channel (edna Pulse)',
            );

            $.ajax({
              url: backend + '/api/channel-connections',
              method: 'POST',
              contentType: 'application/json',
              dataType: 'json',
              data: JSON.stringify({
                installation_id: boot.installation.installation_id,
                display_name: displayName,
                api_key: apiKey,
                channel_id: channelId,
              }),
              timeout: 120000,
            })
              .done(function (res) {
                var scope = res && res.scope_id ? res.scope_id : '';
                $msg
                  .css('color', '#1a7f37')
                  .text(tr('pulse.success', ru ? 'Канал подключён. scope_id: ' : 'Connected. scope_id: ') + scope);
              })
              .fail(function (xhr) {
                var prefix = tr('pulse.error', ru ? 'Ошибка: ' : 'Error: ');
                var detail = '';
                try {
                  var j = xhr.responseJSON;
                  if (j && typeof j.message === 'string') {
                    detail = j.message;
                  } else if (j && Array.isArray(j.message)) {
                    detail = j.message.join('; ');
                  } else {
                    detail = xhr.responseText || String(xhr.status || '');
                  }
                } catch (err) {
                  detail = String(xhr.status || '');
                }
                $msg.css('color', '#c00').text(prefix + detail);
              })
              .always(function () {
                $btn.prop('disabled', false);
              });
          })
          .fail(function () {
            $msg
              .css('color', '#c00')
              .text(
                tr(
                  'pulse.network',
                  ru
                    ? 'Не удалось связаться с сервером (bootstrap).'
                    : 'Could not reach server (bootstrap).',
                ),
              );
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
        if (!$area.length) {
          return true;
        }
        appendConnectUi($area);
        bindConnectHandler($area);
        return true;
      },
      onSave: function () {
        return {
          backend_url: readField('backend_url'),
          api_key: readField('api_key'),
          channel_id: readField('channel_id'),
        };
      },
      destroy: function () {
        $('.widget-settings__body').off('click.ednaPulse');
        $('.widget_settings_block').off('click.ednaPulse');
      },
    };

    return this;
  };
});
