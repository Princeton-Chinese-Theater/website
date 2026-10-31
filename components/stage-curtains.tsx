import styles from './stage-curtains.module.css';

/** Sliced fabric keeps the valance and gathered sides independent of page width. */
export default function StageCurtains() {
  return <div className={styles.stage} aria-hidden="true" />;
}
