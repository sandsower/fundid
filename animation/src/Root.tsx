import { Composition } from "remotion";
import { LogoDrop } from "./LogoDrop";
import { FeatureShowcase } from "./FeatureShowcase";

export const RemotionRoot: React.FC = () => {
  // 26.7s video at 25fps + 4s ender at 25fps
  const showcaseDuration = Math.round(25.7 * 25) + 100;

  return (
    <>
      <Composition
        id="LogoDrop"
        component={LogoDrop}
        durationInFrames={120}
        fps={30}
        width={400}
        height={400}
      />
      <Composition
        id="FeatureShowcase"
        component={FeatureShowcase}
        durationInFrames={showcaseDuration}
        fps={25}
        width={390}
        height={844}
      />
    </>
  );
};
