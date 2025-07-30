module test_aptos_token::test_aptos_token {
    use std::signer;
    use aptos_framework::managed_coin;

    struct TestAptosToken {}

    fun init_module(sender: &signer) {
        managed_coin::initialize<TestAptosToken>(
            sender,
            b"TestAptosToken",
            b"TAT",
            9,
            true
        );
        managed_coin::mint<TestAptosToken>(sender, signer::address_of(sender), 1000000 * 1000000000); // 1M tokens
    }
}