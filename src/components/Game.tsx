import { Stage } from '@pixi/react';
import { useEffect, useRef, useState } from 'react';
import { PixiStaticMap } from './PixiStaticMap';
import { ConvexProvider, useConvex, useMutation, useQuery } from 'convex/react';
import { api } from '../../convex/_generated/api';
import { Player, SelectPlayer } from './Player';

export const Game = ({ setSelectedPlayer }: { setSelectedPlayer: SelectPlayer }) => {
  const convex = useConvex();
  const worldState = useQuery(api.players.getWorld, {});

  const offset = useServerTimeOffset();
  if (!worldState) return null;
  const { world, players } = worldState;
  console.log('worldId', world._id);
  return (
    <Stage width={640} height={640} options={{ backgroundColor: 0xffffff }}>
      <PixiStaticMap map={worldState.map}></PixiStaticMap>
      <ConvexProvider client={convex}>
        {players.map((player) => (
          <Player
            key={player._id}
            player={player}
            offset={offset}
            tileDim={worldState.map.tileDim}
            onClick={setSelectedPlayer}
          />
        ))}
      </ConvexProvider>
    </Stage>
  );
};
export default Game;

const useServerTimeOffset = () => {
  const serverNow = useMutation(api.players.now);
  const [offset, setOffset] = useState(0);
  const prev = useRef<number[]>([]);
  useEffect(() => {
    const updateOffset = async () => {
      console.log('fetching server time');
      const serverTime = await serverNow();
      const newOffset = serverTime - Date.now();
      prev.current.push(newOffset);
      if (prev.current.length > 5) prev.current.shift();
      console.log(prev.current);
      const rollingOffset =
        prev.current.length === 1
          ? prev.current
          : // Take off the max & min as outliers
            [...prev.current].sort().slice(1, -1);
      const avgOffset = rollingOffset.reduce((a, b) => a + b, 0) / prev.current.length;
      setOffset(avgOffset);
    };
    void updateOffset();
    const interval = setInterval(updateOffset, 1000); // TODO: 10000);
    return () => clearInterval(interval);
  }, []);
  return offset;
};