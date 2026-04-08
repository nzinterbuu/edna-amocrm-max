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
