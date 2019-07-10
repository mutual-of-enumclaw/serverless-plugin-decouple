# serverless-plugin-decouple
Allows serverless stacks which import values to leverage the values of the exports rather than the reference to the exports.

## Use case
You have a serverless framework deployment which contains your databases.  In the process of refactoring you realize that
you want to have a caching layer before your database.  Currently you'd have to either make a new export or undeploy
your dependant stacks.

# Implementing

Install the plugin into the directory your serverless.yml is located
``` bash
npm install serverless-plugin-decouple
```

Add the decouple plugin to your plugins, and add a custom variable to turn it on
```yaml
plugins:
    - serverless-plugin-decouple

custom:
    decouple: ${opt:decouple, 'false'}
```

Run the deploy command
```bash
serverless deploy --decouple true
```
