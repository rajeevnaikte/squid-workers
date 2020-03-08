# squid-workers
Multi-processing for NodeJS<br/>
Fork worker Nodes and send a module to run
```
// task.js

const runTask = (name) => {
    return `Hello ${name}`;
};

export default () => {
    return {
        msg: 'Hello World'
    };
}

export {
    runTask
}

// main.js
import WorkersHub from 'squid-workers';

const wh = new WorkersHub(6); // pass worker nodes count to fork

wh.send(`${__dirname}/task`)
    .then(result => {
        console.log(result.msg); // will print 'Hello World'
    });

wh.send(`${__dirname}/task`, 'runTask', 'squid')
    .then(result => {
        console.log(result); // will print 'Hello squid'
    });

wh.close(); // call close anytime, it will wait till all the workers are finished
```
Run array of tasks
```
import WorkersHub from 'squid-workers';

const wh = new WorkersHub(6);
Promise.all([
            'squid',
            'lobster',
            'crab',
            'scallop'
        ].map(item => wh.send(`${__dirname}/task`, 'runTask', item)))
    .then(results => {
        console.log(results);
    });
wh.close();
```
```
// output
[
  'Hello squid',
  'Hello lobster',
  'Hello crab',
  'Hello scallop'
]
```
