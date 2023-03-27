import Image from 'next/image';
import styles from './logo.module.css';

interface Props {
  width: number;
  height: number;
  onClick?: () => void;
}

export default function LottoLogo({ width, height, onClick }: Props) {
  const style = {
    width: `${width}px`,
    height: `${height}px`,
  };

  return (
    <div className={styles.logo} style={style}>
      <Image src="/lotto.svg" alt="minilotto_logo" width={width} height={height} priority onClick={onClick}/>
    </div>
  );
}
