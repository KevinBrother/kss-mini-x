import "reflect-metadata";

type Constructor<T = any> = new (...args: any[]) => T;

const Good = (): ClassDecorator => target => {};

class OtherService {
  a = 1;
}

@Good()
class TestService {
  constructor(public readonly otherService: OtherService) {}

  testMethod() {
    console.log(this.otherService.a);
  }
}

const Factory = <T>(target: Constructor<T>): T => {
  // 获取所有注入的服务
  const providers = Reflect.getMetadata("design:paramtypes", target);
  if(providers) {
    const args = providers.map((provider: any) => new provider);
    return new target(...args);
  }

  return new target();
}

Factory(TestService).testMethod(); // 1

