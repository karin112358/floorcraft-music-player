import { Injectable } from '@angular/core';
import { ElectronService } from 'ngx-electron';
import { Subject } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class IpcService {
  public busyTextSubject = new Subject<string>();

  constructor(private electronService: ElectronService) { }

  public async run<T>(name: string, busyMessage: string, ...params: any[]): Promise<T> {
    if (busyMessage) {
      this.busyTextSubject.next(busyMessage);
    }

    const promise = new Promise<T>((resolve, reject) => {
      this.electronService.ipcRenderer.once(name + 'Finished', (event, params) => {
        if (busyMessage) {
          this.busyTextSubject.next('');
        }

        resolve(params);
      });

      this.electronService.ipcRenderer.send(name, ...params);
    });

    return promise;
  }
}
