#!/usr/bin/env python3
import psycopg2
import sys
import os

# Production database connection
try:
    db_password = os.environ.get('DB_PASSWORD')
    if not db_password:
        print("❌ DB_PASSWORD environment variable not set")
        sys.exit(1)
    
    conn = psycopg2.connect(
        host="localhost",  # or your server IP
        database="athens_db",
        user="postgres",
        password=db_password
    )
    
    with conn:
        with conn.cursor() as cursor:
            # Check database connection
            cursor.execute("SELECT version();")
            version = cursor.fetchone()
            print(f"PostgreSQL version: {version[0]}")
            
            # List all tables
            cursor.execute("""
                SELECT table_name 
                FROM information_schema.tables 
                WHERE table_schema = 'public'
                ORDER BY table_name;
            """)
            
            tables = cursor.fetchall()
            print(f"\nTables in athens_db ({len(tables)} total):")
            for table in tables:
                print(f"  - {table[0]}")
            
            # Check user count
            cursor.execute("SELECT COUNT(*) FROM authentication_customuser;")
            user_count = cursor.fetchone()[0]
            print(f"\nTotal users: {user_count}")
    
    print("\n✅ Database connection successful!")
    
except psycopg2.Error as e:
    print(f"❌ Database connection failed: {e}")
    sys.exit(1)