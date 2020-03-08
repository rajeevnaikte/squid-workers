import {ChildProcess, fork} from 'child_process'

interface ExecProps {
  module: string
  method?: string
  args?: any[]
}

if (process.argv[2] === 'forked') {
  process.on('message', async message => {
    const execProps: ExecProps = message
    const module = await import(execProps.module)
    const res = module[execProps.method || 'default'].apply(null, execProps.args)
    if (process.send) process.send(res || '')
  })

  if (process.send) process.send('ready')
}

interface SubProcessCache {
  forked: boolean
  inUse: boolean
  subProcess: ChildProcess
  callback?: (result: any) => void
}

export default class WorkersHub {
  private state: string = 'initializing'
  private subProcesses: SubProcessCache[] = []
  private waitingForWorker: number = 0

  constructor(workersCount: number) {
    let i = 0
    while (i++ < workersCount) {
      const subProcess = fork(__filename, ['forked'], {stdio: ['inherit', 'inherit', 'inherit', 'ipc']})
      const sp: SubProcessCache = {
        forked: false,
        inUse: false,
        subProcess
      }
      subProcess.on('message', message => {
        if (!sp.forked && message === 'ready') {
          sp.forked = true
          this.subProcesses.push(sp)
          if (this.subProcesses.length === workersCount) {
            this.state = 'ready'
          }
        } else {
          sp.inUse = false
          if (sp.callback) {
            sp.callback(message)
            delete sp.callback
          }
        }
      })
    }
  }

  private async getSubProcess() {
    return new Promise<SubProcessCache>((resolve, reject) => {
      let timeoutCount = 1
      const interval = setInterval(() => {
        const subProcess = this.subProcesses.find(sp => !sp.inUse)
        if (subProcess) {
          clearInterval(interval)
          subProcess.inUse = true
          resolve(subProcess)
        } else if ((timeoutCount * 200) % 600000 === 0) {
          console.warn(`Still waiting for a worker since ${timeoutCount * 200 / 1000} second.`)
        }
        timeoutCount++
      }, 200)
    })
  }

  async send(moduleFullPath: string, methodName?: string, ...args: any): Promise<any> {
    this.waitingForWorker++
    const sp = await this.getSubProcess()
    this.waitingForWorker--
    return new Promise((resolve, reject) => {
      sp.callback = result => {
        resolve(result)
      }
      sp.subProcess.send({
        module: moduleFullPath,
        method: methodName,
        args
      })
    })
  }

  private killIdleProcesses() {
    this.subProcesses
      .filter(sp => !sp.inUse)
      .forEach(sp => {
        sp.inUse = true
        sp.subProcess.kill('SIGHUP')
      })
    this.subProcesses = this.subProcesses.filter(sp => !sp.subProcess.killed)
  }

  close() {
    const interval = setInterval(() => {
      if (this.state === 'ready') {
        if (this.waitingForWorker === 0) {
          this.killIdleProcesses()
        }
        if (this.subProcesses.length === 0) {
          clearInterval(interval)
        }
      }
    }, 200)
  }
}

