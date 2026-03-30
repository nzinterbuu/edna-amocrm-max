/**
 * Install-safe stub: minimal AMD lifecycle for amoCRM.
 * TODO: restore settings UI, backend_url, DOM после успешной установки.
 */
define(['jquery'], function () {
  'use strict';

  return function () {
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
      onSave: function () {
        return true;
      },
      destroy: function () {},
    };

    return this;
  };
});
