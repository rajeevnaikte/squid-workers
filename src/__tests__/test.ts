import WorkersHub from "../index";

const wh = new WorkersHub(5); // pass worker nodes count to fork

wh.send(`${__dirname}/task`)
  .then(result => {
    console.assert(result.msg === 'Hello World'); // will print 'Hello World'
  });

wh.send(`${__dirname}/task`, 'runTask', 'squid')
  .then(result => {
    console.assert(result === 'You are squid'); // will print 'You are squid'
  });

wh.close();

const wh2 = new WorkersHub(5);

wh2.close()

wh2.send(`${__dirname}/task`)
  .then(result => {
    console.assert(result.msg === 'Hello World'); // will print 'Hello World'
  });

wh2.send(`${__dirname}/task`, 'runTask', 'squid')
  .then(result => {
    console.assert(result === 'You are squid'); // will print 'You are squid'
  });
