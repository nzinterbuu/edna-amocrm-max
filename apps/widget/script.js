define(['jquery'], function ($) {
  'use strict';

  /** Единый backend для виджета (не из настроек amoCRM). */
  var BACKEND_BASE_URL = 'https://amocrm-max-widget-api.onrender.com';

  return function () {
    var self = this;
    var $widgetSettingsRoot = null;

    var state = {
      bootstrap: null,
      connectionId: null,
      channelStatus: null,
    };

    function apiUrl(path) {
      var base = String(BACKEND_BASE_URL).replace(/\/+$/, '');
      var p = path.charAt(0) === '/' ? path : '/' + path;
      return base + p;
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

    function readFromSettingsForm(key) {
      var $roots = $('.widget-settings__body');
      if (!$roots.length) {
        $roots = $('.widget_settings_block');
      }
      if (!$roots.length) {
        $roots = $(document);
      }
      if ($widgetSettingsRoot && $widgetSettingsRoot.length) {
        $roots = $widgetSettingsRoot;
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

    function findFieldInSettings(key) {
      var $roots = $widgetSettingsRoot && $widgetSettingsRoot.length
        ? $widgetSettingsRoot
        : $('.widget-settings__body');
      if (!$roots.length) {
        $roots = $('.widget_settings_block');
      }
      if (!$roots.length) {
        $roots = $(document);
      }
      var selectors = [
        'input[name="' + key + '"]',
        'textarea[name="' + key + '"]',
      ];
      for (var i = 0; i < selectors.length; i += 1) {
        var $el = $roots.find(selectors[i]).filter('input, textarea').first();
        if ($el.length) {
          return $el;
        }
      }
      return $();
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
      try {
        if (typeof APP !== 'undefined' && APP.constant) {
          var acc2 = APP.constant('account');
          if (acc2 && acc2.id != null) {
            return String(acc2.id);
          }
        }
      } catch (e2) {
        /* ignore */
      }
      return null;
    }

    function describeBootstrapFailure(xhr, textStatus, errorThrown, ru) {
      var st = xhr && typeof xhr.status === 'number' ? xhr.status : 0;
      var base = tr(
        'pulse.network',
        ru
          ? 'Не удалось связаться с сервером (bootstrap).'
          : 'Could not reach server (bootstrap).',
      );
      if (st === 0) {
        return (
          base +
          ' ' +
          tr('pulse.bootstrap_hint_status0', ru ? 'Проверьте сеть и CORS.' : 'Check network and CORS.')
        );
      }
      var tail =
        (xhr && xhr.responseText && xhr.responseText.slice(0, 200)) ||
        textStatus ||
        errorThrown ||
        '';
      return base + ' HTTP ' + st + (tail ? ' — ' + tail : '');
    }

    function setCredentialFieldsDisabled(disabled) {
      var keys = ['api_key', 'channel_id'];
      for (var k = 0; k < keys.length; k += 1) {
        var $el = findFieldInSettings(keys[k]);
        if (!$el.length) {
          continue;
        }
        $el.prop('disabled', disabled);
        $el.css('opacity', disabled ? '0.85' : '1');
        $el.css(
          'background-color',
          disabled ? '#f4f4f4' : '',
        );
      }
      var $api = findFieldInSettings('api_key');
      if (!disabled && $api.length) {
        $api.removeAttr('placeholder');
      }
      if (disabled && $api.length && !String($api.val() || '').trim()) {
        $api.attr(
          'placeholder',
          tr('pulse.api_key_stored', 'Key stored on server'),
        );
      }
    }

    function applyChannelStateFromBootstrap(boot) {
      state.bootstrap = boot;
      var ch = boot && boot.channel;
      state.connectionId = ch && ch.id ? ch.id : null;
      state.channelStatus = ch && ch.status ? ch.status : null;

      var isActive = !!(ch && ch.status === 'active');
      var isDisconnected = !!(ch && ch.status === 'disconnected');

      setCredentialFieldsDisabled(isActive);

      if (isActive && ch.max_bot_id) {
        var $sig = findFieldInSettings('channel_id');
        if ($sig.length) {
          $sig.val(ch.max_bot_id);
        }
      }

      if (isDisconnected && ch.max_bot_id) {
        var $sigD = findFieldInSettings('channel_id');
        if ($sigD.length) {
          var cur = String($sigD.val() || '').trim();
          if (!cur) {
            $sigD.val(ch.max_bot_id);
          }
        }
      }

      var $wrap =
        $widgetSettingsRoot && $widgetSettingsRoot.length
          ? $widgetSettingsRoot.find('.edna-pulse-connect-wrap')
          : $('.edna-pulse-connect-wrap').first();
      var $status = $wrap.find('.edna-pulse-status');

      if (isActive) {
        $status
          .show()
          .css({ color: '#1a7f37', fontWeight: '600' })
          .text(tr('pulse.channel_active', 'Channel active'));
      } else if (isDisconnected) {
        $status
          .show()
          .css({ color: '#666', fontWeight: 'normal' })
          .text(tr('pulse.channel_inactive', 'Channel disconnected'));
      } else {
        $status.hide().text('');
      }

      var $btnConn = $wrap.find('.edna-pulse-connect');
      var $btnDisc = $wrap.find('.edna-pulse-disconnect');
      $btnConn.prop('disabled', isActive);
      $btnDisc.prop('disabled', !isActive);
    }

    function fetchBootstrap(done) {
      var accountId = getAccountId();
      if (!accountId) {
        if (done) {
          done(null, 'no_account');
        }
        return;
      }
      $.ajax({
        url:
          apiUrl('/api/widget/bootstrap?amocrm_account_id=') +
          encodeURIComponent(accountId),
        method: 'GET',
        dataType: 'json',
        timeout: 30000,
        crossDomain: true,
        xhrFields: { withCredentials: false },
      })
        .done(function (boot) {
          applyChannelStateFromBootstrap(boot);
          if (done) {
            done(boot, null);
          }
        })
        .fail(function (xhr, textStatus, errorThrown) {
          if (done) {
            done(null, { xhr: xhr, textStatus: textStatus, errorThrown: errorThrown });
          }
        });
    }

    function appendConnectUi($area) {
      if ($area.find('.edna-pulse-connect-wrap').length) {
        return;
      }
      var connectLabel = tr('pulse.connect_channel', 'Connect channel');
      var disconnectLabel = tr('pulse.disconnect_channel', 'Disconnect channel');
      var html =
        '<div class="edna-pulse-connect-wrap" style="margin-top:20px;padding-top:16px;border-top:1px solid #e6e6e6">' +
        '<div class="edna-pulse-status" style="display:none;margin-bottom:12px;font-size:14px"></div>' +
        '<div class="edna-pulse-actions" style="display:flex;gap:10px;flex-wrap:wrap">' +
        '<button type="button" class="button-input edna-pulse-connect">' +
        connectLabel +
        '</button>' +
        '<button type="button" class="button-input edna-pulse-disconnect" disabled>' +
        disconnectLabel +
        '</button>' +
        '</div>' +
        '<div class="edna-pulse-msg" style="margin-top:12px;font-size:13px"></div>' +
        '</div>';
      $area.append(html);
    }

    function parseErrorDetail(xhr) {
      try {
        var j = xhr.responseJSON;
        if (j && typeof j.message === 'string' && j.message) {
          return j.message;
        }
        if (j && Array.isArray(j.message)) {
          return j.message.join('; ');
        }
        if (j && typeof j.error === 'string') {
          return j.error;
        }
      } catch (e) {
        /* ignore */
      }
      return (xhr.responseText && xhr.responseText.slice(0, 400)) || String(xhr.status || '');
    }

    function bindHandlers($area) {
      $area.off('click.ednaPulse');
      $area.off('click.ednaDisc');

      $area.on('click.ednaPulse', '.edna-pulse-connect', function () {
        var ru = isRuLocale();
        var $msg = $area.find('.edna-pulse-msg');
        $msg.text('').css('color', '');

        var apiKey = readField('api_key');
        var channelId = readField('channel_id');
        if (!apiKey || !channelId) {
          $msg
            .css('color', '#c00')
            .text(tr('pulse.fill_credentials', ru ? 'Заполните поля.' : 'Fill in the fields.'));
          return;
        }

        var accountId = getAccountId();
        if (!accountId) {
          $msg
            .css('color', '#c00')
            .text(tr('pulse.need_account', ru ? 'Нет account id.' : 'No account id.'));
          return;
        }

        $area.find('.edna-pulse-connect').prop('disabled', true);

        $.ajax({
          url: apiUrl('/api/widget/bootstrap?amocrm_account_id=') + encodeURIComponent(accountId),
          method: 'GET',
          dataType: 'json',
          timeout: 30000,
          crossDomain: true,
          xhrFields: { withCredentials: false },
        })
          .done(function (boot) {
            applyChannelStateFromBootstrap(boot);
            if (!boot || !boot.installation || !boot.installation.installation_id) {
              $msg
                .css('color', '#c00')
                .text(tr('pulse.need_installation', ru ? 'Нет установки.' : 'No installation.'));
              fetchBootstrap(function () {});
              return;
            }

            var displayName = tr(
              'pulse.display_name',
              ru ? 'Канал MAX (edna Pulse)' : 'MAX channel (edna Pulse)',
            );

            $.ajax({
              url: apiUrl('/api/channel-connections'),
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
              crossDomain: true,
              xhrFields: { withCredentials: false },
            })
              .done(function () {
                $msg
                  .css('color', '#1a7f37')
                  .text(tr('pulse.connect_success', ru ? 'Подключено.' : 'Connected.'));
              })
              .fail(function (xhr) {
                if (xhr.status === 409) {
                  $msg
                    .css('color', '#1a7f37')
                    .text(
                      tr(
                        'pulse.already_connected',
                        ru ? 'Уже подключено.' : 'Already connected.',
                      ),
                    );
                  return;
                }
                var prefix = tr('pulse.error', 'Error: ');
                $msg
                  .css('color', '#c00')
                  .text(prefix + parseErrorDetail(xhr));
              })
              .always(function () {
                fetchBootstrap(function () {});
              });
          })
          .fail(function (xhr, textStatus, errorThrown) {
            $msg
              .css('color', '#c00')
              .text(describeBootstrapFailure(xhr, textStatus, errorThrown, ru));
            fetchBootstrap(function () {});
          });
      });

      $area.on('click.ednaDisc', '.edna-pulse-disconnect', function () {
        var ru = isRuLocale();
        var $msg = $area.find('.edna-pulse-msg');
        $msg.text('').css('color', '');

        if (!state.connectionId) {
          $msg
            .css('color', '#c00')
            .text(
              tr(
                'pulse.disconnect_failed',
                ru ? 'Нет ID подключения.' : 'No connection id.',
              ),
            );
          return;
        }

        $area.find('.edna-pulse-disconnect').prop('disabled', true);

        $.ajax({
          url:
            apiUrl('/api/channel-connections/') +
            encodeURIComponent(state.connectionId) +
            '/disconnect',
          method: 'POST',
          contentType: 'application/json',
          dataType: 'json',
          data: JSON.stringify({ reason: 'manual_disconnect' }),
          timeout: 120000,
          crossDomain: true,
          xhrFields: { withCredentials: false },
        })
          .done(function () {
            $msg
              .css('color', '#666')
              .text(tr('pulse.disconnect_success', ru ? 'Отключено.' : 'Disconnected.'));
          })
          .fail(function (xhr) {
            var prefix = tr('pulse.error', 'Error: ');
            $msg.css('color', '#c00').text(prefix + parseErrorDetail(xhr));
          })
          .always(function () {
            fetchBootstrap(function () {});
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
        $widgetSettingsRoot =
          $modal_body && $modal_body.length
            ? $modal_body
            : $('.widget-settings__body');
        if (!$widgetSettingsRoot.length) {
          return true;
        }
        appendConnectUi($widgetSettingsRoot);
        bindHandlers($widgetSettingsRoot);

        var ru = isRuLocale();
        fetchBootstrap(function (_boot, err) {
          if (err === 'no_account') {
            var $m = $widgetSettingsRoot.find('.edna-pulse-msg');
            $m
              .css('color', '#c00')
              .text(tr('pulse.need_account', ru ? 'Нет account id.' : 'No account id.'));
            return;
          }
          if (err && err.xhr) {
            var $m2 = $widgetSettingsRoot.find('.edna-pulse-msg');
            $m2
              .css('color', '#c00')
              .text(
                describeBootstrapFailure(
                  err.xhr,
                  err.textStatus,
                  err.errorThrown,
                  ru,
                ),
              );
          }
        });

        return true;
      },
      onSave: function () {
        return {
          api_key: readField('api_key'),
          channel_id: readField('channel_id'),
        };
      },
      destroy: function () {
        $('.widget-settings__body').off('click.ednaPulse');
        $('.widget-settings__body').off('click.ednaDisc');
        $('.widget_settings_block').off('click.ednaPulse');
        $('.widget_settings_block').off('click.ednaDisc');
        $widgetSettingsRoot = null;
      },
    };

    return this;
  };
});
