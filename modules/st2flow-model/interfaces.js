// @flow

export type TransitionType = 'Success' | 'Error' | 'Complete'

export interface CanvasPoint {
    x: number;
    y: number
}

export interface TaskInterface {
    name: string;
    action: string;
    input?: Object;

    coords: CanvasPoint;
}

export interface TaskRefInterface {
    workflow?: string;
    name: string;
}

export interface TransitionInterface {
    from: TaskRefInterface;
    to: TaskRefInterface;
    type?: TransitionType;
    condition?: string;
}

export interface TransitionRefInterface {
    from: TaskRefInterface;
    to: TaskRefInterface;
}

export interface ModelInterface {
    +version: number;
    +description: string;
    +tasks: Array<TaskInterface>;
    +transitions: Array<TransitionInterface>;

    // These intentionally return void to prevent chaining
    // Consumers are responsible for cleaning up after themselves
    on(event: string, callback: Function): void;
    removeListener(event: string, callback: Function): void;

    constructor(yaml: string): void;
    fromYAML(yaml: string): void;
    toYAML(): string;

    addTask(opts: TaskInterface): void;
    updateTask(ref: TaskRefInterface, opts: TaskInterface): void;
    deleteTask(ref: TaskRefInterface): void;

    addTransition(opts: TransitionInterface): void;
    updateTransition(ref: TransitionRefInterface, opts: TransitionInterface): void;
    deleteTransition(ref: TransitionRefInterface): void;
}

export interface EditorPoint {
    row: number;
    column: number;
}

export interface DeltaInterface {
    start: EditorPoint;
    end: EditorPoint;
    action: 'insert' | 'remove';
    lines: Array<string>;
}

export interface AjvError {
  dataPath: string,
  keyword: string,
  message: string,
  params: Object
};

export interface GenericError {
  message: string
};
