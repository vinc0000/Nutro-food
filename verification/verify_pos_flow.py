import sys
from playwright.sync_api import sync_playwright

def run_verification():
    print("Starting frontend verification script...")
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=True)
        context = browser.new_context(
            record_video_dir="verification/videos",
            viewport={"width": 1280, "height": 800}
        )
        page = context.new_page()

        try:
            # 1. Open Tablet Menu for Table 5
            print("Navigating to Tablet Menu...")
            page.goto("http://localhost:5173/app/tablet?table=5")
            page.wait_for_timeout(1500)

            # Let's take an initial screenshot of the beautiful tablet menu
            page.screenshot(path="verification/screenshots/tablet_menu_loaded.png")
            print("Screenshot taken: tablet_menu_loaded.png")

            # 2. Add 'Wagyu Beef Burger' to the cart
            print("Adding 'Wagyu Beef Burger' to cart...")
            add_button = page.get_by_role("button", name="Add").first
            if add_button.is_visible():
                add_button.click()
                print("Clicked Add button.")
            else:
                page.locator("button:has-text('Add')").first.click()
                print("Clicked Add button (fallback).")
            page.wait_for_timeout(1000)

            # 3. Open Cart
            print("Opening cart...")
            cart_button = page.locator("button:has-text('$')").first
            cart_button.click()
            page.wait_for_timeout(1000)
            page.screenshot(path="verification/screenshots/tablet_cart_opened.png")

            # 4. Click 'Passer la commande (Règlement à la caisse)'
            print("Clicking 'Passer la commande'...")
            page.get_by_role("button", name="Passer la commande (Règlement à la caisse)").click()
            page.wait_for_timeout(2000)
            page.screenshot(path="verification/screenshots/tablet_order_placed.png")
            print("Tablet order placed successfully!")

            # 6. Log in to access protected pages
            print("Navigating to Login page...")
            page.goto("http://localhost:5173/auth/login")
            page.wait_for_timeout(1500)

            print("Signing in with demo cashier credentials...")
            page.get_by_placeholder("you@restaurant.com").fill("demo@nutro.app")
            page.get_by_placeholder("••••••••").fill("demo1234")
            page.get_by_role("button", name="Sign In").click()
            page.wait_for_timeout(2000)
            page.screenshot(path="verification/screenshots/after_login.png")

            # 7. Open POS Terminal
            print("Opening POS Terminal...")
            page.goto("http://localhost:5173/app/pos")
            page.wait_for_timeout(2000)

            # Unlock POS using PIN "1234"
            print("Unlocking POS terminal...")
            for digit in "1234":
                page.get_by_role("button", name=digit).click()
                page.wait_for_timeout(200)
            page.wait_for_timeout(1500)
            page.screenshot(path="verification/screenshots/pos_unlocked.png")

            # 8. Click 'Tablet Orders' to see the order placed by Table 5
            print("Viewing Tablet Orders in POS...")
            page.get_by_role("button", name="Tablet Orders").click()
            page.wait_for_timeout(1500)
            page.screenshot(path="verification/screenshots/pos_tablet_orders_modal.png")

            # 9. Accept the order from Table 5
            print("Accepting Table 5's order in POS...")
            page.get_by_role("button", name="Accept & Load to POS").first.click()
            page.wait_for_timeout(1500)
            page.screenshot(path="verification/screenshots/pos_order_loaded.png")

            # 10. Charge the order on POS
            print("Charging order on POS...")
            charge_btn = page.get_by_role("button", name="Charge").first
            charge_btn.click()
            page.wait_for_timeout(1500)
            page.screenshot(path="verification/screenshots/pos_payment_modal.png")

            # In cash modal, let's select a quick-cash button (the first dynamic option)
            print("Selecting quick cash amount in payment modal...")
            # We must scope to .fixed to avoid clicking the hidden background "Charge" button.
            cash_button = page.locator(".fixed .flex-wrap button").first
            cash_button.click()
            print("Clicked first dynamic cash amount button")
            page.wait_for_timeout(1000)
            page.screenshot(path="verification/screenshots/pos_payment_amount_selected.png")

            # Click "Confirm Cash Payment"
            print("Confirming payment on POS...")
            page.get_by_role("button", name="Confirm Cash Payment").click()
            page.wait_for_timeout(1500)
            page.screenshot(path="verification/screenshots/pos_payment_success.png")

            # 11. Open KDS to verify the kitchen panel receives the order
            print("Opening Kitchen Display System (KDS)...")
            page.goto("http://localhost:5173/app/kds")
            page.wait_for_timeout(2000)
            page.screenshot(path="verification/screenshots/kds_board_received.png")

            # Let's interact with KDS - Start Preparing
            print("Interacting with KDS (Start Preparing)...")
            page.get_by_role("button", name="Start Preparing").first.click()
            page.wait_for_timeout(1500)
            page.screenshot(path="verification/screenshots/kds_preparing.png")

            # Mark Ready
            print("Interacting with KDS (Mark Ready)...")
            page.get_by_role("button", name="Mark Ready").first.click()
            page.wait_for_timeout(1500)
            page.screenshot(path="verification/screenshots/kds_ready.png")

            # Bump/Done
            print("Bumping the ticket from KDS...")
            page.get_by_role("button", name="BUMP").first.click()
            page.wait_for_timeout(1500)
            page.screenshot(path="verification/screenshots/kds_final.png")

            print("Verification CUJ executed successfully and completely recorded!")

        except Exception as e:
            print(f"Error during playwright execution: {e}", file=sys.stderr)
            page.screenshot(path="verification/screenshots/error.png")
            raise e
        finally:
            context.close()
            browser.close()

if __name__ == "__main__":
    run_verification()
