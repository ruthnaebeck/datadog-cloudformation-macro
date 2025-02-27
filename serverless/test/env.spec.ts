import {
  getConfigFromCfnMappings,
  getConfigFromCfnParams,
  defaultConfiguration,
  setEnvConfiguration,
  validateParameters,
  checkForMultipleApiKeys,
} from "../src/env";
import { ArchitectureType, LambdaFunction, RuntimeType } from "../src/layer";

describe("getConfig", () => {
  it("correctly parses parameters from Mappings", () => {
    const params = {
      addLayers: false,
      logLevel: "error",
    };
    const mappings = { Datadog: { Parameters: params } };
    const config = getConfigFromCfnMappings(mappings);
    expect(config).toMatchObject(params);
  });

  it("gets default configuration when no parameters are specified", () => {
    const config = getConfigFromCfnParams({});
    expect(config).toEqual(defaultConfiguration);
  });

  it("gets a mixed a configuration when some values are present", () => {
    const params = {
      site: "my-site",
      enableXrayTracing: false,
    };
    const config = getConfigFromCfnParams(params);
    expect(config).toEqual({
      addLayers: true,
      flushMetricsToLogs: true,
      site: "my-site",
      enableXrayTracing: false,
      enableDDTracing: true,
      enableDDLogs: true,
      enableEnhancedMetrics: true,
      captureLambdaPayload: false,
    });
  });
});

describe("setEnvConfiguration", () => {
  it("sets env vars", () => {
    const lambda: LambdaFunction = {
      properties: {
        Handler: "app.handler",
        Runtime: "python2.7",
        Role: "role-arn",
        Code: {},
      },
      key: "FunctionKey",
      runtimeType: RuntimeType.PYTHON,
      runtime: "python2.7",
      architecture: "x86_64",
      architectureType: ArchitectureType.x86_64,
    };
    const config = {
      addLayers: false,
      apiKey: "1234",
      apiKMSKey: "5678",
      site: "datadoghq.eu",
      logLevel: "debug",
      flushMetricsToLogs: true,
      enableXrayTracing: true,
      enableDDTracing: true,
      enableDDLogs: true,
      enableEnhancedMetrics: true,
      captureLambdaPayload: true,
    };
    setEnvConfiguration(config, [lambda]);

    expect(lambda.properties.Environment).toEqual({
      Variables: {
        DD_API_KEY: "1234",
        DD_FLUSH_TO_LOG: true,
        DD_KMS_API_KEY: "5678",
        DD_LOG_LEVEL: "debug",
        DD_SITE: "datadoghq.eu",
        DD_ENHANCED_METRICS: true,
        DD_SERVERLESS_LOGS_ENABLED: true,
        DD_CAPTURE_LAMBDA_PAYLOAD: true,
      },
    });
  });

  it("doesn't overwrite already present env vars on lambdas", () => {
    const originalEnvVars = {
      DD_API_KEY: "1234",
      DD_FLUSH_TO_LOG: true,
      DD_KMS_API_KEY: "5678",
      DD_LOG_LEVEL: "debug",
      DD_SITE: "datadoghq.eu",
      DD_ENHANCED_METRICS: true,
      DD_CAPTURE_LAMBDA_PAYLOAD: false,
    };
    const lambda: LambdaFunction = {
      properties: {
        Handler: "app.handler",
        Runtime: "python2.7",
        Role: "role-arn",
        Code: {},
        Environment: { Variables: originalEnvVars },
      },
      key: "FunctionKey",
      runtimeType: RuntimeType.PYTHON,
      runtime: "python2.7",
      architecture: "x86_64",
      architectureType: ArchitectureType.x86_64,
    };
    const config = {
      addLayers: false,
      apiKey: "abcd",
      apiKMSKey: "efgh",
      site: "datadoghq.com",
      logLevel: "info",
      flushMetricsToLogs: false,
      enableXrayTracing: true,
      enableDDTracing: true,
      enableDDLogs: true,
      enableEnhancedMetrics: false,
      captureLambdaPayload: false,
    };
    setEnvConfiguration(config, [lambda]);

    expect(lambda.properties.Environment).toEqual({
      Variables: originalEnvVars,
    });
  });

  it("does not define `DD_LOG_LEVEL` by default when logLevel is undefined", () => {
    const lambda: LambdaFunction = {
      properties: {
        Handler: "app.handler",
        Runtime: "python2.7",
        Role: "role-arn",
        Code: {},
      },
      key: "FunctionKey",
      runtimeType: RuntimeType.PYTHON,
      runtime: "python2.7",
      architecture: "x86_64",
      architectureType: ArchitectureType.x86_64,
    };
    const config = {
      addLayers: false,
      apiKey: "1234",
      apiKMSKey: "5678",
      site: "datadoghq.eu",
      logLevel: undefined,
      flushMetricsToLogs: true,
      enableXrayTracing: true,
      enableDDTracing: true,
      enableDDLogs: true,
      enableEnhancedMetrics: true,
      captureLambdaPayload: false,
    };
    setEnvConfiguration(config, [lambda]);

    expect(lambda.properties.Environment).toEqual({
      Variables: {
        DD_API_KEY: "1234",
        DD_FLUSH_TO_LOG: true,
        DD_KMS_API_KEY: "5678",
        DD_SITE: "datadoghq.eu",
        DD_ENHANCED_METRICS: true,
        DD_SERVERLESS_LOGS_ENABLED: true,
        DD_CAPTURE_LAMBDA_PAYLOAD: false,
      },
    });
  });

  it("defines `DD_LOG_LEVEL` when logLevel is defined", () => {
    const lambda: LambdaFunction = {
      properties: {
        Handler: "app.handler",
        Runtime: "python2.7",
        Role: "role-arn",
        Code: {},
      },
      key: "FunctionKey",
      runtimeType: RuntimeType.PYTHON,
      runtime: "python2.7",
      architecture: "x86_64",
      architectureType: ArchitectureType.x86_64,
    };
    const config = {
      addLayers: false,
      apiKey: "1234",
      apiKMSKey: "5678",
      site: "datadoghq.eu",
      logLevel: "info",
      flushMetricsToLogs: true,
      enableXrayTracing: true,
      enableDDTracing: true,
      enableDDLogs: true,
      enableEnhancedMetrics: true,
      captureLambdaPayload: false,
    };
    setEnvConfiguration(config, [lambda]);

    expect(lambda.properties.Environment).toEqual({
      Variables: {
        DD_API_KEY: "1234",
        DD_FLUSH_TO_LOG: true,
        DD_KMS_API_KEY: "5678",
        DD_LOG_LEVEL: "info",
        DD_SITE: "datadoghq.eu",
        DD_ENHANCED_METRICS: true,
        DD_SERVERLESS_LOGS_ENABLED: true,
        DD_CAPTURE_LAMBDA_PAYLOAD: false,
      },
    });
  });

  it("adds `DD_API_KEY_SECRET_ARN` correctly", () => {
    const lambda: LambdaFunction = {
      properties: {
        FunctionName: "my-function",
        Handler: "app.handler",
        Runtime: "python3.9",
        Role: "role-arn",
        Code: {},
      },
      key: "FunctionKey",
      runtimeType: RuntimeType.PYTHON,
      runtime: "python3.9",
      architecture: "x86_64",
      architectureType: ArchitectureType.x86_64,
    };
    const config = {
      addLayers: false,
      apiKeySecretArn: "some-resource:from:aws:secrets-manager:arn",
      site: "datadoghq.eu",
      logLevel: "info",
      flushMetricsToLogs: true,
      enableXrayTracing: true,
      enableDDTracing: true,
      enableDDLogs: true,
      enableEnhancedMetrics: true,
      extensionLayerVersion: 13,
      captureLambdaPayload: false,
    };
    setEnvConfiguration(config, [lambda]);

    expect(lambda.properties.Environment).toEqual({
      Variables: {
        DD_API_KEY_SECRET_ARN: "some-resource:from:aws:secrets-manager:arn",
        DD_FLUSH_TO_LOG: true,
        DD_LOG_LEVEL: "info",
        DD_SITE: "datadoghq.eu",
        DD_ENHANCED_METRICS: true,
        DD_SERVERLESS_LOGS_ENABLED: true,
        DD_CAPTURE_LAMBDA_PAYLOAD: false,
      },
    });
  });

  it("throws error when using synchronous metrics in node using `DD_API_KEY_SECRET_ARN`", () => {
    const lambda: LambdaFunction = {
      properties: {
        FunctionName: "my-function",
        Handler: "app.handler",
        Runtime: "nodejs12.x",
        Role: "role-arn",
        Code: {},
      },
      key: "FunctionKey",
      runtimeType: RuntimeType.NODE,
      runtime: "nodejs12.x",
      architecture: "x86_64",
      architectureType: ArchitectureType.x86_64,
    };
    const config = {
      addLayers: false,
      apiKeySecretArn: "some-resource:from:aws:secrets-manager:arn",
      site: "datadoghq.eu",
      logLevel: "info",
      flushMetricsToLogs: false,
      enableXrayTracing: true,
      enableDDTracing: true,
      enableDDLogs: true,
      enableEnhancedMetrics: true,
      captureLambdaPayload: false,
    };

    expect(() => {
      setEnvConfiguration(config, [lambda]);
    }).toThrowError(
      `\`apiKeySecretArn\` is not supported for Node runtimes (${lambda.properties.FunctionName}) when using Synchronous Metrics. Use either \`apiKey\` or \`apiKmsKey\`.`,
    );
  });
});

describe("validateParameters", () => {
  it("returns an error when given an invalid site url", () => {
    const params = {
      addLayers: true,
      flushMetricsToLogs: true,
      logLevel: "info",
      site: "datacathq.com",
      enableXrayTracing: false,
      enableDDTracing: true,
      enableDDLogs: true,
      enableEnhancedMetrics: true,
      captureLambdaPayload: false,
    };

    const errors = validateParameters(params);
    expect(
      errors.includes(
        "Warning: Invalid site URL. Must be either datadoghq.com, datadoghq.eu, us3.datadoghq.com, us5.datadoghq.com, or ddog-gov.com.",
      ),
    ).toBe(true);
  });

  it("returns an error when extensionLayerVersion and forwarderArn are set", () => {
    const params = {
      addLayers: true,
      flushMetricsToLogs: true,
      logLevel: "info",
      site: "datadoghq.com",
      enableXrayTracing: false,
      enableDDTracing: true,
      enableDDLogs: true,
      enableEnhancedMetrics: true,
      extensionLayerVersion: 6,
      forwarderArn: "test-forwarder",
      captureLambdaPayload: false,
    };

    const errors = validateParameters(params);
    expect(errors.includes("`extensionLayerVersion` and `forwarderArn` cannot be set at the same time.")).toBe(true);
  });

  it("returns an error when extensionLayerVersion is set but neither apiKey nor apiKMSKey is set", () => {
    const params = {
      addLayers: true,
      flushMetricsToLogs: true,
      logLevel: "info",
      site: "datadoghq.com",
      enableXrayTracing: false,
      enableDDTracing: true,
      enableDDLogs: true,
      enableEnhancedMetrics: true,
      extensionLayerVersion: 6,
      captureLambdaPayload: false,
    };

    const errors = validateParameters(params);
    expect(
      errors.includes(
        "When `extensionLayerVersion` is set, `apiKey`, `apiKeySecretArn`, or `apiKmsKey` must also be set.",
      ),
    ).toBe(true);
  });

  it("returns an error when multiple api keys are set", () => {
    const params = {
      addLayers: true,
      apiKey: "1234",
      apiKMSKey: "5678",
      flushMetricsToLogs: true,
      logLevel: "info",
      site: "datacathq.com",
      enableXrayTracing: false,
      enableDDTracing: true,
      enableDDLogs: true,
      enableEnhancedMetrics: true,
      captureLambdaPayload: false,
    };

    const errors = validateParameters(params);
    expect(errors.includes("`apiKey` and `apiKMSKey` should not be set at the same time.")).toBe(true);
  });
});

describe("checkForMultipleApiKeys", () => {
  it("throws error if both API key and KMS API key are defined", () => {
    expect(
      checkForMultipleApiKeys({
        addLayers: false,
        apiKey: "1234",
        apiKMSKey: "5678",
        logLevel: "debug",
        site: "datadoghq.com",
        flushMetricsToLogs: false,
        enableEnhancedMetrics: false,
        enableXrayTracing: false,
        enableDDTracing: false,
        enableDDLogs: false,
        captureLambdaPayload: false,
      }),
    ).toMatch("`apiKey` and `apiKMSKey`");
  });

  it("throws error if both API key and API key secret ARN are defined", () => {
    expect(
      checkForMultipleApiKeys({
        addLayers: false,
        apiKey: "5678",
        apiKeySecretArn: "some-resource:from:aws:secrets-manager:arn",
        logLevel: "debug",
        site: "datadoghq.com",
        flushMetricsToLogs: false,
        enableEnhancedMetrics: false,
        enableXrayTracing: false,
        enableDDTracing: false,
        enableDDLogs: false,
        captureLambdaPayload: false,
      }),
    ).toMatch("`apiKey` and `apiKeySecretArn`");
  });

  it("throws error if both API key secret ARN and KMS API key are defined", () => {
    expect(
      checkForMultipleApiKeys({
        addLayers: false,
        apiKeySecretArn: "some-resource:from:aws:secrets-manager:arn",
        apiKMSKey: "5678",
        logLevel: "debug",
        site: "datadoghq.com",
        flushMetricsToLogs: false,
        enableEnhancedMetrics: false,
        enableXrayTracing: false,
        enableDDTracing: false,
        enableDDLogs: false,
        captureLambdaPayload: false,
      }),
    ).toMatch("`apiKMSKey` and `apiKeySecretArn`");
  });

  it("throws error if both API key secret ARN and KMS API key are defined", () => {
    expect(
      checkForMultipleApiKeys({
        addLayers: false,
        apiKey: "1234",
        apiKeySecretArn: "some-resource:from:aws:secrets-manager:arn",
        apiKMSKey: "5678",
        logLevel: "debug",
        site: "datadoghq.com",
        flushMetricsToLogs: false,
        enableEnhancedMetrics: false,
        enableXrayTracing: false,
        enableDDTracing: false,
        enableDDLogs: false,
        captureLambdaPayload: false,
      }),
    ).toMatch("`apiKey`, `apiKMSKey`, and `apiKeySecretArn`");
  });
});
