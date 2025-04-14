import * as monaco from 'monaco-editor';

// Initialize JavaScript language features
monaco.languages.typescript.javascriptDefaults.setDiagnosticsOptions({
  noSemanticValidation: false,
  noSyntaxValidation: false
});

// Set compiler options for JavaScript
monaco.languages.typescript.javascriptDefaults.setCompilerOptions({
  target: monaco.languages.typescript.ScriptTarget.ES2020,
  allowNonTsExtensions: true,
  moduleResolution: monaco.languages.typescript.ModuleResolutionKind.NodeJs,
  module: monaco.languages.typescript.ModuleKind.CommonJS,
  noEmit: true,
  typeRoots: ["node_modules/@types"]
});

// Add additional JavaScript language features if needed
monaco.languages.typescript.javascriptDefaults.addExtraLib(`
/**
 * Frida API TypeDefs
 */
declare namespace Java {
  function perform(fn: Function): void;
  function use(className: string): any;
}

declare namespace ObjC {
  const available: boolean;
  function classes: any;
  function Object(handle: NativePointer): any;
}

declare namespace Interceptor {
  function attach(target: NativePointer, callbacks: any): any;
}

declare function console.log(message: string): void;
`, 'frida.d.ts');

export default monaco; 