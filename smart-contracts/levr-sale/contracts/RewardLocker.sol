import "@openzeppelin/contracts/math/Math.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Detailed.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Burnable.sol";
import "@openzeppelin/contracts/token/ERC20/ERC20Mintable.sol";
import "./DSMath.sol";

contract RewardLocker is DSMath
{
    using SafeMath for uint256;

    struct Deposit
    {
        uint amount;
        uint lockUpPeriod;
        uint share;
    }

    mapping (address => uint) shares;

    function stake(uint _amount, uint _time, address _retriever) public;
    function claim(address _recipient) public;
}