pragma solidity ^0.8.0;

interface IWeth
{
    function wrap() external payable;
}

interface IERC20
{
    function transfer(address _to, uint256 _value) external;
    function balanceOf(address) external view returns (uint256);
}

contract Splitter
{
    // This contract recieved Eth and LEVR tokens and sends them to their respective gulper contracts.

    IERC20 public levrErc20;
    IERC20 public daiErc20;
    IERC20 public fryErc20;
    address public weth;

    address public wethGulper;
    address public daiGulper;
    address public dEthGulper;
    
    function Split() 
        public
    { 
        // goal:
        // 1. wrap all the eth
        // 2. send 47.5% of weth to wethGulper
        // 3. convert 47.5% of weth to dai
        // 4. send the dai to daiGulper
        // 5. send 1/3rd of the LEVR balance to each gulper


        // logic:
        // * wrap all the ether
        // * manage the send to the wethGulper
        // * manage the send to the daiGulper
        // * manage the send to the dEthGulper

        WrapEth();
        uint wethBalance = IERC20(weth).balanceOf(address(this));
        uint levrBalance = levrErc20.balanceOf(address(this));
        GulpWeth(wethBalance*1000/475, levrBalance);
        GulpDai(wethBalance*1000/475, levrBalance);
        GulpDeth(levrBalance);
        BurnFry(wethBalance);
    }

    function WrapEth()
        private
    {
        IWeth(weth).wrap();
    }

    function GulpWeth(uint _wethBalance, uint _levrBalance)
        private
    {
        IERC20(weth).transfer(wethGulper, _wethBalance);
        levrErc20.transfer(wethGulper, _levrBalance);
    }

    function GulpDai(uint _wethBalance, uint _levrBalance)
        private
    {
        SwapWethForDai(_wethBalance);
        daiErc20.transfer(daiGulper, daiErc20.balanceOf(address(this)));
        levrErc20.transfer(daiGulper, _levrBalance);
    }

    function SwapWethForDai(uint _wethBalance)
        private
    {
        // TODO : Swap weth for DAI.
    }

    function GulpDeth(uint _levrBalance)
        private
    {
        levrErc20.transfer(dEthGulper, _levrBalance);
    }

    function BurnFry(uint _wethBalance)
        private
    {
        SwapWethForFry(_wethBalance);
        fryErc20.transfer(address(1), fryErc20.balanceOf(address(this)));
    }

    function SwapWethForFry(uint _wethBalance)
        private
    {
        // TODO : Swap weth for Fry.
    }
}