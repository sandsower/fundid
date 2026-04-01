import {
  AbsoluteFill,
  Sequence,
  staticFile,
  useVideoConfig,
} from "remotion";
import { Video } from "@remotion/media";
import { LogoDrop } from "./LogoDrop";

export const FeatureShowcase: React.FC = () => {
  const { fps } = useVideoConfig();

  const VIDEO_DURATION = Math.round(25.7 * fps);
  const ENDER_DURATION = 4 * fps; // 4 seconds

  return (
    <AbsoluteFill style={{ backgroundColor: "#FFF8F0" }}>
      {/* Screen recording of the flow */}
      <Sequence durationInFrames={VIDEO_DURATION} premountFor={fps}>
        <AbsoluteFill>
          <Video
            src={staticFile("screens/flow.webm")}
            muted
            style={{ width: 390, height: 844 }}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Logo ender */}
      <Sequence from={VIDEO_DURATION} durationInFrames={ENDER_DURATION} premountFor={fps}>
        <LogoDrop />
      </Sequence>
    </AbsoluteFill>
  );
};
