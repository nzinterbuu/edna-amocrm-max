define(['jquery'], function () {
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

    function renderBackendUrlForm(title, backendLabel) {
      var backendUrl = readBackendUrl();
      return (
        '<div class="edna-settings-page">' +
        '<div style="font-weight:600;margin-bottom:8px;">' +
        title +
        '</div>' +
        '<div class="widget_settings_block__item_field">' +
        '<label class="widget_settings_block__title_field">' +
        backendLabel +
        '</label>' +
        '<input type="text" name="backend_url" value="' +
        backendUrl.replace(/"/g, '&quot;') +
        '" class="widget_settings_block__input_field" />' +
        '</div>' +
        '</div>'
      );
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
        var title = tr('advanced.title', 'Settings');
        var backendLabel = tr('settings.backend_url', 'Backend URL');
        return renderBackendUrlForm(title, backendLabel);
      },
      initMenuPage: function (params) {
        if (!params || params.location !== 'settings') {
          return;
        }
        if (params.subitem_code !== 'edna_widget_settings') {
          return;
        }
        var title = tr('left_menu.settings_page', 'Widget Settings');
        var backendLabel = tr('settings.backend_url', 'Backend URL');
        return renderBackendUrlForm(title, backendLabel);
      },
      onSave: function () {
        return true;
      },
      destroy: function () {},
    };

    return this;
  };
});
