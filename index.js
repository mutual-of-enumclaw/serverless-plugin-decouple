'use strict';

const aws = require('aws-sdk');

class ServerlessPlugin {
    constructor(serverless, options) {
        this.serverless = serverless;
        this.options = options;

        this.hooks = {
        'after:aws:package:finalize:mergeCustomProviderResources': this.package.bind(this),
        };
    }

    /**
     * Before packaging functions must be redirected to point at the binary built
     */
    async package() {
        const decouple = (this.serverless.service.custom || {}).decouple || 'false';
        this.serverless.cli.log(`Evaluating decouple (${decouple})`);
        if(decouple != 'true') {
            this.serverless.cli.log(`Skipping decouple (${decouple})`);
            return;
        }

        aws.config.region = this.serverless.service.provider.region || 'us-east-1';
        if(this.serverless.service.provider.profile) {
            console.log('Using profile');
            var credentials = new aws.SharedIniFileCredentials({profile: this.serverless.service.provider.profile});
            aws.config.credentials = credentials;
        } else if (this.serverless.providers.aws.options['aws-profile']) {
            console.log('Using aws-profile');
            var credentials = new aws.SharedIniFileCredentials({profile: this.serverless.providers.aws.options['aws-profile']});
            aws.config.credentials = credentials;
        }
        const cloudformation = new aws.CloudFormation();
        const exportMap = {};
        const exportParams = {};
        do {
            const result = await cloudformation.listExports(exportParams).promise();
            exportParams.NextToken = '';
            if(result) {
                for(let exp of result.Exports) {
                    exportMap[exp.Name] = exp.Value;
                }

                exportParams.NextToken = result.NextToken;
                await new Promise((resolve) => {
                    setTimeout(() => {
                        resolve();
                    }, 500);
                });
            }
        } while(exportParams.NextToken && exportParams.NextToken != '')

        this.serverless.cli.log(`Getting cloudformation`);
        var cft = JSON.stringify(this.serverless.service.provider.compiledCloudFormationTemplate);
        var matches = cft.match(/\{\W*\"Fn::ImportValue\":\W*\"(\w|\-|\_)+\"\W*?\}/g, "i");
        if(matches) {
            this.serverless.cli.log(`Retrieved matches ` + matches.length);
            for(var match of matches) {
                const importStatement = JSON.parse(match);
                let value = match;
                const name = importStatement['Fn::ImportValue'];
                if(exportMap[name]) {
                    value = `"${exportMap[name]}"`;
                }
                cft = cft.replace(match, value);
            }

            this.serverless.service.provider.compiledCloudFormationTemplate = JSON.parse(cft);
        }
    }
}

module.exports = ServerlessPlugin