import { Composition } from "remotion";
import { LogoDrop } from "./LogoDrop";

export const RemotionRoot: React.FC = () => {
  return (
    <Composition
      id="LogoDrop"
      component={LogoDrop}
      durationInFrames={120}
      fps={30}
      width={400}
      height={400}
    />
  );
};
