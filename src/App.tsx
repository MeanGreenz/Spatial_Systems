import {ReactRunner} from "@~DaDesu~/Spatial_System";
import {Stage} from "./Stage";
import {TestStageRunner} from "./TestRunner";

function App() {
  const isDev = import.meta.env.MODE === 'development';
  console.info(`Running in ${import.meta.env.MODE}`);

  return isDev ? <TestStageRunner factory={ (data: any) => new Stage(data) }/> :
      <ReactRunner factory={(data: any) => new Stage(data)} />;
}

export default App
