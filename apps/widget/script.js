define(['jquery'], function ($) {
  'use strict';

  return function () {
    var self = this;

    function readBackendUrl() {
      if (!self.get_settings) {
        return '';
      }
      var settings = self.get_settings() || {};
      if (settings.backend_url) {
        return String(settings.backend_url);
      }
      if (settings.fields && settings.fields.backend_url) {
        return String(settings.fields.backend_url);
      }
      return '';
    }

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

    function escapeAttr(s) {
      return String(s || '')
        .replace(/&/g, '&amp;')
        .replace(/"/g, '&quot;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    }

    function getWidgetCode() {
      var s = self.get_settings ? self.get_settings() : {};
      if (s && s.widget_code) {
        return String(s.widget_code);
      }
      return '';
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

    function renderAdvancedPage() {
      var title = tr('advanced.title', 'Settings');
      var backendLabel = tr('settings.backend_url', 'Backend URL');
      var backendUrl = readBackendUrl();
      var section = tr('pulse.section_title', 'MAX channel (edna Pulse)');
      var apiLabel = tr('pulse.api_key', 'API key');
      var channelLabel = tr('pulse.channel_id', 'Channel ID');
      var connectLabel = tr('pulse.connect', 'Connect channel');

      return (
        '<div class="edna-advanced-root">' +
        '<div class="edna-section-backend">' +
        '<div style="font-weight:600;margin-bottom:8px;">' +
        title +
        '</div>' +
        '<div class="widget_settings_block__item_field">' +
        '<label class="widget_settings_block__title_field">' +
        backendLabel +
        '</label>' +
        '<input type="text" name="backend_url" value="' +
        escapeAttr(backendUrl) +
        '" class="widget_settings_block__input_field edna-input-backend-url" autocomplete="off" />' +
        '</div>' +
        '</div>' +
        '<div class="edna-section-pulse" style="margin-top:20px;padding-top:16px;border-top:1px solid #e6e6e6">' +
        '<div style="font-weight:600;margin-bottom:12px;">' +
        section +
        '</div>' +
        '<div class="widget_settings_block__item_field">' +
        '<label class="widget_settings_block__title_field">' +
        apiLabel +
        '</label>' +
        '<input type="password" class="widget_settings_block__input_field edna-pulse-api-key" autocomplete="off" />' +
        '</div>' +
        '<div class="widget_settings_block__item_field" style="margin-top:12px">' +
        '<label class="widget_settings_block__title_field">' +
        channelLabel +
        '</label>' +
        '<input type="text" class="widget_settings_block__input_field edna-pulse-channel-id" autocomplete="off" />' +
        '</div>' +
        '<button type="button" class="button-input edna-pulse-connect" style="margin-top:12px">' +
        connectLabel +
        '</button>' +
        '<div class="edna-pulse-msg" style="margin-top:12px;font-size:13px"></div>' +
        '</div>' +
        '</div>'
      );
    }

    function bindPulseConnect(widgetCode) {
      if (!widgetCode) {
        return;
      }
      var $wa = $('#work-area-' + widgetCode);
      $wa.off('click.ednaPulse');
      $wa.on('click.ednaPulse', '.edna-pulse-connect', function () {
        var ru = isRuLocale();
        var $msg = $wa.find('.edna-pulse-msg');
        $msg.text('').css('color', '');

        var backendRaw =
          $wa.find('.edna-input-backend-url').val() || readBackendUrl();
        var backend = trimSlash(backendRaw);
        if (!backend) {
          $msg
            .css('color', '#c00')
            .text(
              tr(
                'pulse.need_backend',
                ru
                  ? 'Укажите URL бэкенда и сохраните настройки.'
                  : 'Set backend URL and save settings.',
              ),
            );
          return;
        }

        var apiKey = $wa.find('.edna-pulse-api-key').val();
        var channelId = $wa.find('.edna-pulse-channel-id').val();
        if (
          !apiKey ||
          !String(apiKey).trim() ||
          !channelId ||
          !String(channelId).trim()
        ) {
          $msg
            .css('color', '#c00')
            .text(
              tr(
                'pulse.fill_credentials',
                ru
                  ? 'Введите API-ключ и ID канала.'
                  : 'Enter API key and channel ID.',
              ),
            );
          return;
        }

        var accountId = getAccountId();
        if (!accountId) {
          $msg
            .css('color', '#c00')
            .text(
              tr(
                'pulse.need_account',
                ru
                  ? 'Не удалось определить аккаунт amoCRM.'
                  : 'Could not detect amoCRM account.',
              ),
            );
          return;
        }

        var $btn = $wa.find('.edna-pulse-connect').prop('disabled', true);

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
                api_key: String(apiKey).trim(),
                channel_id: String(channelId).trim(),
              }),
              timeout: 120000,
            })
              .done(function (res) {
                var scope = res && res.scope_id ? res.scope_id : '';
                $msg
                  .css('color', '#1a7f37')
                  .text(
                    tr(
                      'pulse.success',
                      ru
                        ? 'Канал подключён. scope_id: '
                        : 'Connected. scope_id: ',
                    ) + scope,
                  );
              })
              .fail(function (xhr) {
                var prefix = tr('pulse.error', ru ? 'Ошибка: ' : 'Error: ');
                var detail = '';
                try {
                  var j = xhr.responseJSON;
                  if (j) {
                    if (typeof j.message === 'string') {
                      detail = j.message;
                    } else if (Array.isArray(j.message)) {
                      detail = j.message.join('; ');
                    } else if (xhr.responseText) {
                      detail = xhr.responseText;
                    } else {
                      detail = String(xhr.status || '');
                    }
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
      settings: function () {
        return true;
      },
      advancedSettings: function () {
        var html = renderAdvancedPage();
        var widgetCode = getWidgetCode();
        if (widgetCode) {
          $('#work-area-' + widgetCode).html(html);
          bindPulseConnect(widgetCode);
        }
        return true;
      },
      onSave: function () {
        var widgetCode = getWidgetCode();
        if (!widgetCode) {
          return true;
        }
        var $inp = $('#work-area-' + widgetCode).find(
          'input[name="backend_url"]',
        );
        if ($inp.length) {
          var v = String($inp.val() || '').trim();
          return { backend_url: v };
        }
        return true;
      },
      destroy: function () {
        var widgetCode = getWidgetCode();
        if (widgetCode) {
          $('#work-area-' + widgetCode).off('click.ednaPulse');
        }
      },
    };

    return this;
  };
});
