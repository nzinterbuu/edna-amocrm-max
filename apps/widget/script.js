/**
 * amoCRM widget — lifecycle + минимальный UI (настройки и вложенные области).
 * Дальше: вернуть вызовы backend в render после проверки контейнеров.
 */
define(['jquery'], function ($) {
  'use strict';

  function escapeHtml(s) {
    return String(s).replace(/[&<>"']/g, function (ch) {
      return (
        {
          '&': '&amp;',
          '<': '&lt;',
          '>': '&gt;',
          '"': '&quot;',
          "'": '&#39;',
        }[ch] || ch
      );
    });
  }

  /** amoCRM кладёт widget_code в params / system; без него #work-area-* не находится. */
  function resolveWidgetCode(self) {
    try {
      if (self.params && self.params.widget_code) {
        return String(self.params.widget_code);
      }
      if (
        typeof AMOCRM !== 'undefined' &&
        AMOCRM.widgets &&
        AMOCRM.widgets.system &&
        AMOCRM.widgets.system.widget_code
      ) {
        return String(AMOCRM.widgets.system.widget_code);
      }
      var s = self.get_settings && self.get_settings();
      if (s && s.widget_code) {
        return String(s.widget_code);
      }
    } catch (e) {
      console.error('[edna-max] resolveWidgetCode', e);
    }
    return '';
  }

  function mergedSettings(self) {
    var sys =
      (typeof AMOCRM !== 'undefined' && AMOCRM.widgets && AMOCRM.widgets.system) ||
      {};
    return $.extend({}, sys, self.params || {});
  }

  function minimalMarkup(widgetCode) {
    return (
      '<div class="edna-max-mvp" style="padding:12px;font-family:sans-serif;max-width:640px">' +
      '<h3>MAX Widget Loaded</h3>' +
      '<p style="margin:8px 0;color:#333">Виджет инициализирован.</p>' +
      '<p style="font-size:12px;color:#666">widget_code: <code>' +
      escapeHtml(widgetCode || '—') +
      '</code></p>' +
      '</div>'
    );
  }

  function mountIntoSelectors(self, html) {
    var code = resolveWidgetCode(self);
    var $work = code ? $('#work-area-' + code) : $();
    if ($work.length) {
      $work.html(html);
      return $work;
    }
    var $settings = $('.widget-settings__body');
    if ($settings.length) {
      $settings.html(html);
      return $settings;
    }
    console.warn('[edna-max] no container (work-area or widget-settings__body)');
    return $();
  }

  return function () {
    var self = this;

    self.get_settings = function () {
      return mergedSettings(self);
    };

    self.callbacks = {
      init: function () {
        try {
          console.log('[edna-max] init');
        } catch (e) {
          console.error('[edna-max] init', e);
        }
        return true;
      },

      bind_actions: function () {
        return true;
      },

      /** Экран настроек интеграции (locations: settings) — основной контейнер amoCRM. */
      settings: function () {
        try {
          console.log('[edna-max] settings()');
          var code = resolveWidgetCode(self);
          var $box = $('.widget-settings__body');
          if ($box.length) {
            $box.html(minimalMarkup(code));
          } else {
            mountIntoSelectors(self, minimalMarkup(code));
          }
        } catch (e) {
          console.error('[edna-max] settings', e);
        }
        return true;
      },

      /** Карточки / «everywhere»: work-area-{widget_code} или fallback. */
      render: function () {
        try {
          console.log('[edna-max] render()');
          var code = resolveWidgetCode(self);
          mountIntoSelectors(self, minimalMarkup(code));
        } catch (e) {
          console.error('[edna-max] render', e);
        }
        return true;
      },

      destroy: function () {},

      onSave: function () {
        return true;
      },
    };

    return this;
  };
});
