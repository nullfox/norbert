![Norbert](https://github.office.opendns.com/bfox/norbert/raw/master/images/logo.png)

Norbert
========
*The awesome 90s themed framework build on top of Hapi*

### Installation

```
npm install --save git://github.office.opendns.com/bfox/norbert
```

### Resource-based one-file server example

```
var Norbert = require('norbert'),
    Ecosystem = require('models/ecosystem');

// Each type CRUD operation has a corresponding Norbert.Resource.* class
var read = Norbert.Resource.Read.factory(
    {
        // Validate route params, in this case /1.0/beavers/{beaverId} as a required integer
        params: {
            beaverId: Norbert.Joi.number().integer().required()
        }
    },
    
    // You can return absolute values or promise chains!
    // 404s are automatically handled if a null value or resolving promise returns null in Read resources
    function handler(request) {
        return Ecosystem.findBeaver(request.params.beaverId);
    }
);

var readCollection = Norbert.Collection.factory(
    // Override the global default limit per endpoint
    {
        defaultLimit: 100
    },
    
    // Limit and page are resolved automatically
    function handler(request) {
        return Ecosystem.findBeavers({
            limit: request.query.limit,
            page: request.query.page
        });
    }
);

var create = Norbert.Resource.Create.factory(
    {
        // Validate the payload automagically
        payload: {
            name: Norbert.Joi.string().required(),
            favoriteWoodSpecies: Norbert.Joi.string().only('spruce', 'redwood', 'cedar'),
            age: Norbert.Joi.number().integer().required()
        }
    },
    
    // All return values that implement a toEndpoint method will be automatically triggered and used as the return value
    function handler(request) {
        return Ecosystem.addBeaver(request.payload);
    }
);

var beaver = {
    Read: read,
    ReadCollection: readCollection,
    Create: create  
};

var server = Norbert.Server.factory();

server.addResource('/1.0/beavers/{beaverId}', beaver);

server.start()
.then(function () {
    console.log('Server started!');
})
.catch(function (err) {
    console.log('Server could not be started', err);
});
```

### Simple route-based one-file server example

```
var Norbert = require('norbert'),
    Ecosystem = require('models/ecosystem');

// Each type CRUD operation has a corresponding Norbert.Resource.* class
var read = Norbert.Resource.Read.factory(
    {
        // Validate route params, in this case /1.0/beavers/{beaverId} as a required integer
        params: {
            beaverId: Norbert.Joi.number().integer().required()
        }
    },
    
    // You can return absolute values or promise chains!
    // 404s are automatically handled if a null value or resolving promise returns null in Read resources
    function handler(request) {
        return Ecosystem.findBeaver(request.params.beaverId);
    }
);

var server = Norbert.Server.factory();

server.addRoute('/1.0/beavers/{beaverId}', read);

server.start()
.then(function () {
    console.log('Server started!');
})
.catch(function (err) {
    console.log('Server could not be started', err);
});
```