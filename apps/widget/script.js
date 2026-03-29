/**
 * amoCRM widget — setup, status, channels, diagnostics only.
 * Transport and secrets stay on backend. TODO: verify manifest keys & areas vs official widget structure.
 */
define(['jquery', 'underscore'], function ($, _) {
  'use strict';

  function trimSlash(url) {
    return String(url || '').replace(/\/+$/, '');
  }

  function api(self, path) {
    var base = trimSlash(self.get_settings().backend_url);
    return base + path;
  }

  function getLang(self, key) {
    try {
      return (self.lang && self.lang[key]) || key;
    } catch (e) {
      return key;
    }
  }

  return function () {
    var self = this;

    self.get_settings = function () {
      return (typeof AMOCRM !== 'undefined' && AMOCRM.widgets && AMOCRM.widgets.system) || {};
    };

    self.callbacks = {
      settings: function () {
        return true;
      },
      init: function () {
        return true;
      },
      bind_actions: function () {
        return true;
      },
      render: function () {
        var $w = $('#work-area-' + self.get_settings().widget_code);
        if (!$w.length) {
          return true;
        }
        var acc =
          typeof AMOCRM !== 'undefined' && AMOCRM.constant
            ? AMOCRM.constant('account')
            : null;
        var accountId = acc && acc.id;
        if (!accountId) {
          $w.html('<p>' + getLang(self, 'ui.no_installation') + '</p>');
          return true;
        }

        $w.html('<p class="edna-max-loading">' + getLang(self, 'ui.loading') + '</p>');

        $.getJSON(
          api(self, '/api/widget/bootstrap'),
          { amocrm_account_id: String(accountId) },
        )
          .done(function (data) {
            renderDashboard($w, data, self);
          })
          .fail(function () {
            $w.html('<p>Bootstrap failed. Check backend_url.</p>');
          });

        return true;
      },
      destroy: function () {},
      onSave: function () {
        return true;
      },
    };

    function renderDashboard($root, data, self) {
      var inst = data.installation;
      var L = function (k) {
        return getLang(self, k);
      };
      if (!inst) {
        $root.html('<p>' + L('ui.no_installation') + '</p>');
        return;
      }

      var channels = data.channels || [];
      var html = [];
      html.push('<div class="edna-max-widget" style="font-family:sans-serif;max-width:720px">');
      html.push('<h2>' + L('ui.title') + '</h2>');
      html.push(
        '<p><strong>' +
          L('ui.installation_id') +
          ':</strong> <code>' +
          inst.installation_id +
          '</code></p>',
      );
      html.push(
        '<p><strong>' +
          L('ui.status') +
          ':</strong> ' +
          inst.status +
          ' · sub: ' +
          inst.subdomain +
          '</p>',
      );

      html.push('<h3>' + L('ui.channels') + '</h3>');
      if (!channels.length) {
        html.push('<p>—</p>');
      } else {
        html.push('<ul>');
        channels.forEach(function (c) {
          html.push('<li style="margin:8px 0">');
          html.push(
            '<strong>' +
              _.escape(c.display_name) +
              '</strong> · bot: ' +
              _.escape(c.max_bot_id),
          );
          html.push(
            '<div style="font-size:12px;opacity:.85">scope: ' +
              _.escape(c.scope_id) +
              '</div>',
          );
          html.push(
            '<div style="font-size:11px;margin-top:4px">' +
              L('ui.copy_webhook') +
              ':<br/><input readonly style="width:100%" value="' +
              _.escape(api(self, '/api/webhooks/max/' + c.id)) +
              '"/></div>',
          );
          html.push(
            '<button type="button" class="button-input edna-disconnect" data-id="' +
              _.escape(c.id) +
              '" style="margin-top:6px">' +
              L('ui.disconnect') +
              '</button> ',
          );
          html.push(
            '<button type="button" class="button-input edna-health" data-id="' +
              _.escape(c.id) +
              '">' +
              L('ui.health') +
              '</button>',
          );
          html.push('</li>');
        });
        html.push('</ul>');
      }

      html.push('<h3>' + L('ui.connect') + '</h3>');
      html.push('<div style="border:1px solid #ddd;padding:12px;border-radius:6px">');
      html.push(
        '<p>' +
          L('ui.edna_bind_hint') +
          ': <input id="edna-code" placeholder="' +
          L('ui.edna_code') +
          '" style="width:260px"/></p>',
      );
      html.push('<p><button type="button" id="edna-bind" class="button-input">' + L('ui.bind') + '</button></p>');
      html.push('<hr/>');
      html.push(
        '<p>' +
          L('ui.display_name') +
          ': <input id="ch-name" style="width:220px"/> ' +
          L('ui.max_bot') +
          ': <input id="ch-bot" style="width:220px"/></p>',
      );
      html.push(
        '<p><em>edna tenant id после привязки (из ответа bind):</em> <input id="ch-tenant" style="width:360px"/></p>',
      );
      html.push(
        '<p><button type="button" id="ch-create" class="button-input">' +
          L('ui.connect') +
          '</button></p>',
      );
      html.push('</div>');

      html.push('<h3 id="diag-title">' + L('ui.diagnostics') + '</h3>');
      html.push('<pre id="diag-out" style="background:#f7f7f7;padding:10px;overflow:auto"></pre>');
      html.push('</div>');

      $root.html(html.join(''));

      $root.on('click', '#edna-bind', function () {
        var code = $('#edna-code').val();
        $.ajax({
          url: api(self, '/api/edna/session/bind'),
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({
            installation_id: inst.installation_id,
            edna_auth_code: code,
          }),
        }).done(function (r) {
          $('#ch-tenant').val(r.tenant_id);
          $('#diag-out').text(JSON.stringify(r, null, 2));
        });
      });

      $root.on('click', '#ch-create', function () {
        $.ajax({
          url: api(self, '/api/channel-connections'),
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({
            installation_id: inst.installation_id,
            display_name: $('#ch-name').val(),
            edna_tenant_id: $('#ch-tenant').val(),
            max_bot_id: $('#ch-bot').val(),
          }),
        }).done(function (r) {
          $('#diag-out').text(JSON.stringify(r, null, 2));
          self.callbacks.render();
        });
      });

      $root.on('click', '.edna-disconnect', function () {
        var id = $(this).data('id');
        $.ajax({
          url: api(self, '/api/channel-connections/' + encodeURIComponent(id) + '/disconnect'),
          method: 'POST',
          contentType: 'application/json',
          data: JSON.stringify({ reason: 'manual_disconnect' }),
        }).always(function () {
          self.callbacks.render();
        });
      });

      $root.on('click', '.edna-health', function () {
        var id = $(this).data('id');
        $.getJSON(api(self, '/api/channel-connections/' + encodeURIComponent(id) + '/health')).done(
          function (r) {
            $('#diag-out').text(JSON.stringify(r, null, 2));
          },
        );
      });
    }

    return this;
  };
});
