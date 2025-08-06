class Tap {
  constructor() {
    this.taps = [];
  }
  addTap(tap) {
    this.taps.push(tap);
  }
  call(data) {
    this.taps.forEach((tap) => {
      tap(data);
    });
  }
}

class MyLife {
  hooks = {
    beforeCreate: new Tap(),
    afterCreate: new Tap(),
  };

  beforeCreate() {
    console.log("beforeCreate");
    this.hooks.beforeCreate.call("beforeCreate data");
  }

  addBeforeCreateTap(tap) {
    this.hooks.beforeCreate.addTap(tap);
  }

  addAfterCreateTap(tap) {
    this.hooks.afterCreate.addTap(tap);
  }

  afterCreate() {
    console.log("afterCreate");
    this.hooks.afterCreate.call("afterCreate data");
  }

  create() {
    this.beforeCreate();
    console.log("create");
    this.afterCreate();
  }
}

const myLife = new MyLife();
myLife.addBeforeCreateTap((data) => {
  console.log("beforeCreate1", data);
});
myLife.addBeforeCreateTap((data) => {
  console.log("beforeCreate2", data);
});
myLife.addAfterCreateTap((data) => {
  console.log("afterCreate1", data);
});
myLife.addAfterCreateTap((data) => {
  console.log("afterCreate2", data);
});
myLife.create();
