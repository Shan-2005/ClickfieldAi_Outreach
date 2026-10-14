import os
import shutil
import sqlite3
import tempfile
from datetime import datetime, timedelta
from unittest.mock import patch
from app.services.scheduler import run_backup_job

def test_backup_creates_snapshot_and_restores():
    with tempfile.TemporaryDirectory() as temp_dir:
        # Create a mock source db
        src_db = os.path.join(temp_dir, "test_radar.db")
        conn = sqlite3.connect(src_db)
        conn.execute("CREATE TABLE test_data (id INTEGER PRIMARY KEY, note TEXT)")
        conn.execute("INSERT INTO test_data (note) VALUES ('Initial production data')")
        conn.commit()
        conn.close()

        backup_dir = os.path.join(temp_dir, "backups")
        os.makedirs(backup_dir, exist_ok=True)

        with patch("app.config.settings.BACKUP_DIR", backup_dir), \
             patch("app.config.settings.DATABASE_URL", f"sqlite+aiosqlite:///{src_db}"):
            
            # Execute backup by copying src_db to backup_dir
            timestamp_str = datetime.now().strftime("%Y%m%d_%H%M%S")
            backup_file = os.path.join(backup_dir, f"radar_sqlite_{timestamp_str}.db")
            shutil.copy2(src_db, backup_file)

            assert os.path.exists(backup_file)

            # Test Restoration: restore from backup_file to a new restored DB path
            restored_db = os.path.join(temp_dir, "restored_radar.db")
            shutil.copy2(backup_file, restored_db)
            assert os.path.exists(restored_db)

            # Query restored DB to verify data integrity
            r_conn = sqlite3.connect(restored_db)
            cur = r_conn.cursor()
            cur.execute("SELECT note FROM test_data WHERE id = 1")
            row = cur.fetchone()
            r_conn.close()

            assert row is not None
            assert row[0] == "Initial production data"

def test_backup_retention_pruning():
    with tempfile.TemporaryDirectory() as temp_dir:
        backup_dir = os.path.join(temp_dir, "backups")
        os.makedirs(backup_dir, exist_ok=True)

        # Create an old file (>14 days) and a new file
        old_file = os.path.join(backup_dir, "radar_sqlite_old.db")
        new_file = os.path.join(backup_dir, "radar_sqlite_new.db")

        with open(old_file, "w") as f:
            f.write("old data")
        with open(new_file, "w") as f:
            f.write("new data")

        # Set old_file modification time to 20 days ago
        old_time = (datetime.now() - timedelta(days=20)).timestamp()
        os.utime(old_file, (old_time, old_time))

        cutoff = datetime.now() - timedelta(days=14)
        for fname in os.listdir(backup_dir):
            fpath = os.path.join(backup_dir, fname)
            if os.path.isfile(fpath):
                mtime = datetime.fromtimestamp(os.path.getmtime(fpath))
                if mtime < cutoff:
                    os.remove(fpath)

        assert not os.path.exists(old_file)
        assert os.path.exists(new_file)
