import { handleSsmParameter, handleArgoCdAdminSecret } from '../src/index';
import * as crypto from 'crypto';

// Mock crypto.randomBytes to return a simple buffer
jest.spyOn(crypto, 'randomBytes').mockImplementation(() => Buffer.from('mockedpassword'));

describe("Core functionality tests", () => {
  it("handles SSM parameter update (mocked)", async () => {
    const paramName = '/test/parameter';
    const paramValue = 'testValue';
    const overwrite = false;

    await handleSsmParameter(paramName, paramValue, overwrite);
    // Assert that the function ran (real console output or further assertions can be added)
    expect(console.log).toHaveBeenCalledWith(
      `SSM parameter "${paramName}" updated with value "${paramValue}".`
    );
  });

  it("handles Secrets Manager secret creation (mocked)", async () => {
    const secretName = 'testSecret';
    await handleArgoCdAdminSecret(secretName);
    expect(console.log).toHaveBeenCalledWith(
      expect.stringContaining(`Secret "${secretName}" created with value "mockedpassword"`)
    );
  });

  it("provides static arguments", () => {
    const args = getStaticArgs();
    expect(args.configDir).toBe('./config');
    expect(args.environments).toContain('dev');
  });
});

// Clear console.log mock after each test
afterEach(() => {
  jest.clearAllMocks();
});

// Simple utility function to return static arguments for testing
export function getStaticArgs() {
  return {
    configDir: './config',
    environments: ['dev']
  };
}